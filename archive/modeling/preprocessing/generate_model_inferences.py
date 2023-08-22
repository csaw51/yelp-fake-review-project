import joblib
import argparse
import pandas as pd


numeric_feature_columns = ['rating', 'num_word',
                           'num_noun', 'num_verb', 'num_adj', 'num_adv', 'num_personal_pronoun',
                           'avg_word_len', 'lexical_diversity', 'sentiment', 'typo_ratio',
                           'emotiveness_ratio', 'num_positive_words', 'num_negative_words',
                           'num_clauses', 'previous_user_reviews', 'avg_user_sentiment',
                           'avg_user_rating', 'total_user_reviews', 'user_content_similarity',
                           'positive_reviews', 'negative_reviews', 'positive_review_ratio',
                           'negative_review_ratio', 'avg_business_sentiment',
                           'avg_business_rating', 'total_business_reviews']
text_feature_columns = ['lemma']
id_columns = ['user_id', 'business_id']


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Pre-process yelp datasets')
    parser.add_argument('--input_path', default='../data/yelp_academic_dataset_preprocessed.tsv')
    parser.add_argument('--output_path', default='../data/reviews_with_predicted_label_final_rf.csv')
    parser.add_argument('--model_path', default='../data/rf_final_model.pkl')
    args = parser.parse_args()
    model = joblib.load(args.model_path)

    df = pd.read_csv(args.input_path, sep='\t')
    null_lemma = df['lemma'].isna()
    filtered_df = df[~null_lemma]
    all_predictions = model.predict(filtered_df[numeric_feature_columns + text_feature_columns])

    try:
        predicted_reviews = pd.DataFrame({'review_id': filtered_df['review_id'],
                                          'review_label': all_predictions})
    except Exception:
        predicted_reviews = pd.DataFrame({'index': filtered_df.index,
                                          'review_label': all_predictions})
    predicted_reviews.to_csv(args.output_path, sep=',', index=False)
