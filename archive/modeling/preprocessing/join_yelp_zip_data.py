import pandas as pd
import argparse


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Pre-process yelp datasets')
    parser.add_argument('--metadata_path', default='../data/metadata')
    parser.add_argument('--review_content_path', default='../data/reviewContent')
    parser.add_argument('--output_path', default='../data/yelpzip_joined.tsv')
    args = parser.parse_args()

    metadata = pd.read_csv(args.metadata_path,
                           sep='\t',
                           header=None,
                           names=['user_id', 'prod_id', 'rating', 'label', 'date'])
    review_content = pd.read_csv(args.review_content_path,
                                 sep='\t',
                                 header=None,
                                 names=['user_id', 'prod_id', 'date', 'review'])

    joined = metadata.merge(review_content,  on=['user_id', 'prod_id', 'date'], how='inner')
    joined.to_csv(args.output_path, sep='\t', index=False)
