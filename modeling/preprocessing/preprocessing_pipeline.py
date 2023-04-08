import json
import csv
import re
import sys
import logging

from datetime import datetime
from collections import Counter

import numpy as np
import pandas as pd
import spacy
import nltk

from sklearn.feature_extraction.text import TfidfVectorizer
from spellchecker import SpellChecker
from sklearn.metrics.pairwise import cosine_similarity

"""
Pseudo-code for pre-processing the data:
    1. Read in dataset
    DONE
    
    2. For each row, preprocessing raw sentences:
        (Chris's note: Much of this can likely be offloaded to sklearn's TfidfVectorizer.build_analyzer()
         class, which can handle the majority of these steps)
        1. Convert all text to lowercase (tfidf analyzer)
        2. Fix any potential encoding errors
        3. Replace contractions with true words
        4. Remove punctuation (tfidf analyzer)
        5. Remove numbers (tfidf analyzer)
        6. Remove stopwords (tfidf analyzer)
        7. Lemmatize words
    DONE
    
    3. For each row, create 'text summary' features
        1. Count num_words in review ( len(review_list) )
        2. Use NLTK pos_tag (part-of-speech tagging) to classify words by part of speech
            (Chris's note: consider using pos_tag_sents() func as it appears to be more
             performant for large datasets such as ours)
        3. Count num_verb, num_adj, num_adv, num_noun, avg_word_len
        4. Calculate emotiveness ( (num_adj + num_adv) / (num_noun + num_verb) )
        5. Count num_positive and num_negative (need to load in positive and negative word lists)
        6. Calculate sentiment ( (num_positive - num_negative) / text_len )
        7. Create lexical diversity using lexical_diversity.lex_div.ttr func
        8. Create typo ratio ( len(misspelled_words) / text_len ), using spellchecker.SpellChecker
           to identify misspelled words
        9. Count num_clauses
       10. Count num_personal_pronoun (Chris's note: are these removed as stopwords?)
       11. Count of primary punctuation (need to use non-processed text for this as these are removed)
    
    4. Create 'behavioral summary' features
        1. avg_user_sentiment
        2. avg_user_review
        3. total_user_reviews
        4. previous_user_reviews (num reviews made prior to the current review temporally)
        5. previous_user_reviews_24h (num reviews made in prior 24 hours)
        6. max_user_reviews_24h (num reviews made in any 24 hour span)\
        7. positive_review_ratio (4-5 star reviews / total reviews)
        8. negative_review_ratio (1-2 star reviews / total reviews)
        7. avg_business_sentiment
        8. avg_business_review
        9. total_business_reviews
    5. Write pre-processed data to disk
    6. Done
    
Final list of input features required for inferencing (may change as we perform more robust feature selection):
    1. lemmatized_words (needed to generate tf-idf representation in inferencing pipeline)
    2. num_words
    3. num_verbs
    4. num_nouns
    5. num_adj
    6. num_adv
    7. avg_word_len
    8. emotiveness_ratio
    9. num_positive
   10. num_negative
   11. sentiment
   12. rating
   13. lexical_diversity
   14. typo_ratio
   15. num_clauses
   16. num_personal_pronoun
   17. punctuation_count_.
   18. punctuation_count_,
   19. punctuation_count_!
   20. punctuation_count_?
   21. punctuation_count_:
   22. avg_user_sentiment
   23. avg_user_review
   24. total_user_reviews
   25. previous_user_reviews
   26. previous_user_reviews_24h
   27. max_user_reviews_24h
   28. review_sentiment_ratio (ratio of positive and negative reviews)
   29. avg_business_sentiment
   30. avg_business_review
   31. total_business_reviews
"""


def read_csv(filepath, columns, delimiter='\t'):
    df = pd.read_csv(filepath, sep=delimiter, header=None, names=columns)
    return df


def read_json(filepath):
    return pd.read_json(filepath, lines=True)


def read_txt_file(filepath):
    with open(filepath, 'r') as fp:
        data = fp.read().split()
    return data



def calc_time_diff(starttime, endtime):
    return (endtime - starttime).seconds


def write_csv(filepath, df, delimiter='\t'):
    df.write_csv(filepath, sep=delimiter)
    return True


def fix_review_encoding(df_col):
    # Runs in 15 secs on full 7 mil rows
    logging.info("Fixing encoding issues")
    starttime = datetime.now()
    new_df_col = df_col.str.encode('utf-8').replace(br'(\xc2)(.)', b'')\
                       .str.decode('utf-8')
    logging.info(f"{new_df_col.shape[0]} rows processed in {calc_time_diff(starttime, datetime.now())} seconds")
    return new_df_col


def fix_contractions(df_col, contraction_map=None):
    # Runs in 117 secs on full 7 mil rows
    logging.info("Fixing word contractions issues")
    starttime = datetime.now()
    if not contraction_map:
        contraction_map = {
            "can't": "can not",
            "won't": "will not",
            "let's": "let us",
            "'m": " am",
            "n't": " not",
            "'d": " had",
            "'ll": " will",
            "'ve": " have",
            "'s": " is",
            "'re": " are",
            "st\\.": "street",
            "bldg\\.": "building"
        }
    new_df_col = df_col.replace(contraction_map, regex=True)
    logging.info(f"{new_df_col.shape[0]} rows processed in {calc_time_diff(starttime, datetime.now())} seconds")
    return new_df_col


def clean_text(df_col):
    def tokenize_text(sentence, analyzer):
        tokens = ' '.join(analyzer(sentence))
        return tokens

    logging.info("Transforming text with TFIDF analyzer")
    starttime = datetime.now()
    analyzer = TfidfVectorizer(token_pattern=r'(?u)\b\w\w+\b').build_analyzer()
    new_df_col = df_col.apply(lambda x: tokenize_text(x, analyzer))

    logging.info(f"{new_df_col.shape[0]} rows processed in {calc_time_diff(starttime, datetime.now())} seconds")
    return new_df_col


def check_clauses(doc):
    def find_root_of_sentence(doc):
        for token in doc:
            if token.dep_ == "ROOT":
                return token

    def find_other_verbs(doc, root_token):
        other_verbs = []
        for token in doc:
            ancestors = list(token.ancestors)
            if token.pos_ == "VERB" and len(ancestors) == 1 and ancestors[0] == root_token:
                other_verbs.append(token)
        return other_verbs

    def get_clause_token_span_for_verb(verb, doc, all_verbs):
        if verb:
            first_token_index = len(doc)
            last_token_index = 0
            this_verb_children = list(verb.children)

            for child in this_verb_children:
                if child not in all_verbs:
                    if child.i < first_token_index:
                        first_token_index = child.i
                    if child.i > last_token_index:
                        last_token_index = child.i
            return first_token_index, last_token_index

    if doc:
        root_token = find_root_of_sentence(doc)

        if root_token:
            other_verbs = find_other_verbs(doc, root_token)
            token_spans = []
            all_verbs = [root_token] + other_verbs
            for other_verb in all_verbs:
                token_indices = get_clause_token_span_for_verb(other_verb,
                                                               doc,
                                                               all_verbs)
                token_spans.append(token_indices)

            sentence_clauses = []
            for token_span in token_spans:
                start = token_span[0]
                end = token_span[1]
                if start < end:
                    clause = doc[start:end]
                    sentence_clauses.append(clause)
            return len(sentence_clauses)
        else:
            return 0
    else:
        return 0


def create_text_summary_features(df, positive_words, negative_words, n_process=1, correct_spelling=False):
    starttime = datetime.now()
    curtime = starttime
    nltk_pos_word_map = {'noun': 'NOUN',
                         'verb': 'VERB',
                         'adverb': 'ADV',
                         'adjective': 'ADJ'}
    word_sentiment_map = {'positive': set(positive_words),
                          'negative': set(negative_words)}
    spellcheck = SpellChecker()
    spellcheck.word_frequency.load_words(['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th',
                                          '10th', '11th', '12th', '13th', '14th', '15th', '16th', '17th', '18th',
                                          '19th',
                                          '20th', '21st', '22nd', '23rd', '24th', '25th', '26th', '27th', '28th',
                                          '29th',
                                          '30th', '31st'])
    output = []
    line_num = 0
    i = 0
    personal_pronouns = {'i', 'you', 'u', 'he', 'she', 'it', 'we',
                         'they', 'me', ' him', 'her', 'us', ' them'}
    if correct_spelling:
        # Removing all the spelling correction dependencies unless correct_spelling is True
        from textblob import TextBlob
        from langdetect import detect
        from nltk.corpus import words
        from nltk.metrics.distance import jaccard_distance
        from nltk.util import ngrams
        nltk.download("words")
        def correct_word_spelling(word):
            interjections_list = ['aha', 'ahem', 'ahh', 'ahoy', 'alas', 'arg', 'aw', 'bam', 'bingo',
                                  'blah', 'boo', 'bravo', 'brrr', 'cheers', 'congratulations',
                                  'dang', 'drat', 'darn', 'duh', 'eek', 'eh', 'encore', 'eureka',
                                  'fiddlesticks', 'gadzooks', 'gee', 'golly', 'goodness', 'gosh',
                                  'haha', 'hallelujah', 'hey', 'hmm', 'huh', 'hurray', 'humph',
                                  'oh', 'oops', 'ouch', 'ow', 'phew', 'phooey', 'pooh', 'pow',
                                  'shh', 'shoo', 'ugh', 'wahoo', 'whoa', 'whoops', 'wow',
                                  'yikes', 'yeah', 'yippee', 'yo', 'yuck']
            correct_words = words.words()
            corrected_word = word

            if word not in interjections_list:
                corrected_word = str(TextBlob(word).correct())
                try:
                    if detect(corrected_word) == 'en' and len(corrected_word) > 0:
                        j_distances = [(jaccard_distance(set(ngrams(word, 2)),
                                                         set(ngrams(w, 2))),
                                        w)
                                       for w in correct_words if w[0] == word[0]]

                        corrected_word = sorted(j_distances, key=lambda val: val[0])[0][1]

                except Exception as e:
                    logging.error(f'Error correcting the spelling of {word}: {e}')

                corrected_word = str(TextBlob(corrected_word).correct())

            return corrected_word

    logging.info("Beginning text summary feature creation")
    nlp = spacy.load('en_core_web_sm', disable=['ner'])
    for doc in nlp.pipe(df.cleaned_text, n_process=n_process):
        feature_dict = {}
        pos_counts = Counter()
        text = []
        lemma = []
        positive_word_count = 0
        negative_word_count = 0
        pronoun_counter = 0
        typo_list = spellcheck.unknown([t.text for t in doc])

        for token in doc:
            pos_counts[token.pos_] += 1
            if token.pos_ not in {'SPACE', 'PUNCT', 'SYM'}:
                text.append(token.text)

                if not token.is_stop:
                    lem = token.lemma_
                    if correct_spelling:
                        if lem in typo_list:
                            lem = correct_word_spelling(lem)
                    lemma.append(lem)

                if token.text in word_sentiment_map['positive']:
                    positive_word_count += 1
                elif token.text in word_sentiment_map['negative']:
                    negative_word_count += 1

                if token.text in personal_pronouns:
                    pronoun_counter += 1
        feature_dict['lemma'] = ' '.join(lemma)
        feature_dict['num_word'] = len(text)
        feature_dict['num_noun'] = pos_counts[nltk_pos_word_map['noun']]
        feature_dict['num_verb'] = pos_counts[nltk_pos_word_map['verb']]
        feature_dict['num_adj'] = pos_counts[nltk_pos_word_map['adjective']]
        feature_dict['num_adv'] = pos_counts[nltk_pos_word_map['adverb']]
        feature_dict['num_personal_pronoun'] = pronoun_counter

        if lemma:
            feature_dict['avg_word_len'] = np.mean([len(word) for word in lemma])
            feature_dict['lexical_diversity'] = len(set(lemma)) / len(lemma)
            feature_dict['sentiment'] = ((positive_word_count - negative_word_count)
                                         / len(lemma))
        else:
            feature_dict['avg_word_len'] = 0.
            feature_dict['lexical_diversity'] = 0.0
            feature_dict['sentiment'] = 0.0

        try:
            feature_dict['typo_ratio'] = len(typo_list) / feature_dict['num_word']
        except ZeroDivisionError:
            feature_dict['typo_ratio'] = 0.0

        try:
            feature_dict['emotiveness_ratio'] = ((feature_dict['num_adj'] + feature_dict['num_adv'])
                                                 / (feature_dict['num_noun'] + feature_dict['num_verb']))
        except ZeroDivisionError:
            feature_dict['emotiveness_ratio'] = 0.0

        feature_dict['num_positive_words'] = positive_word_count
        feature_dict['num_negative_words'] = negative_word_count
        feature_dict['num_clauses'] = check_clauses(doc)
        output.append(feature_dict)

        if line_num > 0 and line_num % 10000 == 0:
            logging.info(f"Processed rows {i} to {line_num} in {calc_time_diff(curtime, datetime.now())} seconds")
            curtime = datetime.now()
            i = line_num

        line_num += 1

    new_df_col = pd.DataFrame(output)
    logging.info(f"{new_df_col.shape[0]} rows processed in {calc_time_diff(starttime, datetime.now())} seconds")
    return new_df_col


def create_behavioral_summary_features(df):
    starttime = datetime.now()
    logging.info("Beginning behavioral summary feature creation")

    def get_review_cosine_similarity(cleaned_text, vectorizer):
        corpus_vec = vectorizer.transform(cleaned_text)
        return (-1 + cosine_similarity(corpus_vec, corpus_vec)[0, :].sum()) / corpus_vec.shape[0]

    vectorizer = TfidfVectorizer()
    vectorizer.fit(df.lemma)

    # previous_user_reviews
    df['previous_user_reviews'] = df.sort_values(['user_id', 'date']).groupby('user_id').cumcount()
    # Avg/total user sentiment/review
    user_id_counts = df[['user_id', 'sentiment', 'rating', 'lemma']].groupby('user_id').agg(
        {'sentiment': ['mean'],
         'rating': ['mean', 'count'],
         'lemma': [lambda x: get_review_cosine_similarity(x, vectorizer)]})
    user_id_counts.columns = ['avg_user_sentiment', 'avg_user_rating',
                              'total_user_reviews', 'user_content_similarity']

    # Positive/Negative review ratio
    positive_reviews = df[df['rating'] >= 4][['user_id', 'rating']] \
        .groupby('user_id').count().rename({'rating': 'positive_reviews'}, axis=1)
    negative_reviews = df[df['rating'] <= 2][['user_id', 'rating']] \
        .groupby('user_id').count().rename({'rating': 'negative_reviews'}, axis=1)
    user_id_counts = user_id_counts.merge(positive_reviews, on='user_id', how='left') \
        .merge(negative_reviews, on='user_id', how='left').fillna(0)
    user_id_counts['positive_review_ratio'] = user_id_counts['positive_reviews'] / user_id_counts['total_user_reviews']
    user_id_counts['negative_review_ratio'] = user_id_counts['negative_reviews'] / user_id_counts['total_user_reviews']

    # Last 24 hours
    user_date_counts = df[['user_id', 'date', 'review']].groupby(['user_id', 'date']).count().rename(
        {'review': 'user_reviews_previous_24h'}, axis=1).reset_index()
    max_reviews_24h = user_date_counts[['user_id', 'user_reviews_previous_24h']].groupby('user_id').max().rename(
        {'max': 'max_user_reviews_24h'})

    # Merging all the user df's together:
    user_id_counts.merge(user_date_counts, on='user_id', how='inner').merge(max_reviews_24h, on='user_id', how='inner')

    # Business_reviews
    business_id_counts = df[['business_id', 'sentiment', 'rating']].groupby('business_id').agg(
        {'sentiment': ['mean'],
         'rating': ['mean', 'count']})
    business_id_counts.columns = ['avg_business_sentiment', 'avg_business_rating', 'total_business_reviews']

    logging.info(f"{df.shape[0]} rows processed in {calc_time_diff(starttime, datetime.now())} seconds")

    return df.merge(user_id_counts, on='user_id').merge(business_id_counts, on='business_id')


if __name__ == '__main__':
    logger = logging.getLogger()
    logger.setLevel(logging.DEBUG)
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    handler = logging.StreamHandler()
    handler.setFormatter(formatter)
    logger.addHandler(handler)
    logging.info('Start of pre-processing script')

    filepath = sys.argv[1]
    raw_data = read_json(filepath)
    logging.info(f"Collected df with {raw_data.shape[0]} rows")
    pos_word_path = '../../data/preprocessing and features for modeling/Opinion Lexicon/positive-words.txt'
    neg_word_path = '../../data/preprocessing and features for modeling/Opinion Lexicon/negative-words.txt'
    positive_words = set(read_txt_file(pos_word_path))
    negative_words = set(read_txt_file(neg_word_path))

    # Data cleaning
    raw_data['cleaned_text'] = fix_review_encoding(raw_data['text'])
    raw_data['cleaned_text'] = fix_contractions(raw_data['cleaned_text'])
    raw_data['cleaned_text'] = clean_text(raw_data['cleaned_text'])

    summary_features = create_text_summary_features(raw_data,
                                                    positive_words,
                                                    negative_words,
                                                    n_process=8,
                                                    correct_spelling=False)
    combined = pd.concat([raw_data, summary_features], axis=1).rename({'product_id': 'business_id'}, axis=1)
    all_features = create_behavioral_summary_features(combined)
    all_features.to_csv('../../data/yelp_all/preprocessed_dataset.csv', sep='\t')
