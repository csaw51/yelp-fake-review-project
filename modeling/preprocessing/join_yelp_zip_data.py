import pandas as pd
import argparse


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Pre-process yelp datasets')
    parser.add_argument('metadata_path',)
    parser.add_argument('review_content_path',)
    parser.add_argument('output_path',)
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
