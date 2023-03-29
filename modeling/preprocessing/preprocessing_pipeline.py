import json
import csv
import re
import sys
import logging

from datetime import datetime
from collections import Counter

import numpy as np
import pandas as pd
import nltk
import spacy

from sklearn.feature_extraction.text import TfidfVectorizer
from nltk.corpus import stopwords
from spellchecker import SpellChecker

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


def transform_and_lemmatize_text(df_col, stop_words=None):
    def lemmatize_text(sentence, analyzer, lemmatizer):
        tokens = ' '.join(analyzer(sentence))
        lemmatized_tokens = [i.lemma_ for i in lemmatizer(tokens)]
        return lemmatized_tokens

    logging.info("Transforming text with TFIDF analyzer and spacy lemmatizer")
    starttime = datetime.now()
    lemmatizer = spacy.load('en_core_web_sm', disable=['parser', 'ner'])
    analyzer = TfidfVectorizer(stop_words=stop_words).build_analyzer()
    new_df_col = df_col.apply(lambda x: lemmatize_text(x, analyzer, lemmatizer))

    logging.info(f"{new_df_col.shape[0]} rows processed in {calc_time_diff(starttime, datetime.now())} seconds")
    return new_df_col


def create_text_summary_features(df, positive_words, negative_words):
    starttime = datetime.now()
    nltk_pos_word_map = {'noun': 'NN',
                         'verb': 'VB',
                         'adverb': 'RB',
                         'adjective': 'JJ'}
    word_sentiment_map = {'positive': set(positive_words),
                          'negative': set(negative_words)}
    spellcheck = SpellChecker()
    output = []
    line_num = 0

    logging.info("Beginning text summary feature creation")
    for i in range(df.shape[0]):

        feature_dict = {}
        sentence = df.cleaned_text.iloc[i]
        pos_counts = Counter([y for x, y in nltk.pos_tag(sentence)])

        feature_dict['num_word'] = len(sentence)
        feature_dict['num_noun'] = pos_counts[nltk_pos_word_map['noun']]
        feature_dict['num_verb'] = pos_counts[nltk_pos_word_map['verb']]
        feature_dict['num_adj'] = pos_counts[nltk_pos_word_map['adjective']]
        feature_dict['num_adv'] = pos_counts[nltk_pos_word_map['adverb']]
        feature_dict['avg_word_len'] = np.mean([len(word) for word in sentence])
        feature_dict['emotiveness_ratio'] = ((feature_dict['num_adj'] + feature_dict['num_adv'])
                                             / (feature_dict['num_noun'] + feature_dict['num_verb']))
        feature_dict['num_positive_words'] = len([i for i in sentence if i in word_sentiment_map['positive']])
        feature_dict['num_negative_words'] = len([i for i in sentence if i in word_sentiment_map['negative']])
        feature_dict['sentiment'] = ((feature_dict['num_positive_words'] - feature_dict['num_negative_words'])
                                     / feature_dict['num_word'])
        feature_dict['lexical_diversity'] = len(set(sentence)) / feature_dict['num_word']
        feature_dict['typo_ratio'] = len(spellcheck.unknown(sentence)) / feature_dict['num_word']

        output.append(feature_dict)

        if i % 10000 == 0:
            logging.info(f"Processed rows {line_num} to {i} in {calc_time_diff(starttime, datetime.now())} seconds")
            line_num = i
            starttime = datetime.now()

    return pd.DataFrame(output)


def create_behavioral_summary_features(df):
    starttime = datetime.now()
    logging.info("Beginning behavioral summary feature creation")
    # previous_user_reviews
    df['previous_user_reviews'] = df.sort_values(['user_id', 'date']).groupby('user_id').cumcount()

    # Avg/total user sentiment/review
    user_id_counts = df[['user_id', 'sentiment', 'review']].groupby('user_id').agg(
        {'sentiment': ['mean'],
         'review': ['mean', 'count']})
    user_id_counts.columns = ['avg_user_sentiment', 'avg_user_review', 'total_user_reviews']

    # Positive/Negative review ratio
    positive_reviews = df[df['rating'] >= 4][['user_id', 'rating']]\
        .groupby('user_id').count().rename({'count': 'positive_reviews'}, axis=1)
    negative_reviews = df[df['rating'] <= 2][['user_id', 'rating']]\
        .groupby('user_id').count().rename({'count': 'negative_reviews'}, axis=1)
    user_id_counts = user_id_counts.merge(positive_reviews, on='user_id', how='left')\
        .merge(negative_reviews, on='user_id', how='left')
    user_id_counts['positive_review_ratio'] = user_id_counts['positive_reviews'].fillna(0) / user_id_counts['total_user_reviews']
    user_id_counts['negative_review_ratio'] = user_id_counts['negative_reviews'].fillna(0) / user_id_counts['total_user_reviews']

    # Last 24 hours
    user_date_counts = df[['user_id', 'date']].groupby(['user_id', 'date']).count().rename({'count': 'user_reviews_previous_24h'}).reset_index()
    max_reviews_24h = user_date_counts[['user_id', 'user_reviews_previous_24h']].groupby('user_id').max().rename({'max': 'max_user_reviews_24h'})

    # Merging all the user df's together:
    user_id_counts.merge(user_date_counts, on='user_id', how='inner').merge(max_reviews_24h, on='user_id', how='inner')

    # Business_reviews
    business_id_counts = df[['business_id', 'sentiment']].groupby('business_id').agg(
        {'sentiment': ['mean'],
         'review': ['mean', 'count']})
    business_id_counts.columns = ['avg_business_sentiment', 'avg_business_review', 'total_business_reviews']

    logging.info(f"{df.shape[0]} rows processed in {calc_time_diff(starttime, datetime.now())} seconds")

    return df.merge(user_id_counts, on='user_id').merge(business_id_counts, on='business_id')


if __name__ == '__main__':
    # TODO: Add spelling correction to pre-processing
    # TODO: Optimize clause count code and add to feature list
    # TODO: Add personal pronoun count
    logging.basicConfig(level='info')
    filepath = sys.argv[1]
    df = read_json(filepath)
    logging.info(f"Collected df with {df.shape[0]} rows")

    # Data cleaning
    df['cleaned_text'] = fix_review_encoding(df['text'])
    df['cleaned_text'] = fix_contractions(df['cleaned_text'])
    df['cleaned_text'] = transform_and_lemmatize_text(df['cleaned_text'], stop_words=stopwords)
