import json
import pandas as pd
import os

def main():
    # file paths
    os.chdir('..')
    yelp_file = os.path.join('data','yelp_academic_dataset_review.json')
    prediction_file = os.path.join('data', 'reviews_with_predicted_label_final_rf.csv')
    metro_file = os.path.join('data', 'metro_data.csv')

    # import yelp json dataset
    print('reading JSON...')
    data_file = open(yelp_file, encoding='utf-8')
    reviews = []
    for line in data_file:
        reviews.append(json.loads(line))
    reviews_df = pd.DataFrame(reviews)
    data_file.close()

    # import model output
    print('reading predictions...')
    predictions_df = pd.read_csv(prediction_file)

    # merge review_df with predictions_df
    labeled_reviews = reviews_df.merge(predictions_df, on='review_id')
    labeled_reviews = labeled_reviews[['review_id','business_id','stars','review_label']]

    # rename 'review_label' column and update labels: -1 (fake) -> 1, 1 (real) -> 0
    labeled_reviews = labeled_reviews.rename(columns={'review_label':'is_fake'})
    labeled_reviews['is_fake'] = labeled_reviews['is_fake'].replace(1,0)
    labeled_reviews['is_fake'] = labeled_reviews['is_fake'].replace(-1,1)

    # aggregate review predictions to business level with mean stars, sum of fake reviews, and review count
    grouped_labeled_reviews = labeled_reviews.groupby(by='business_id').agg(
        avg_stars=('stars','mean'), fake_review_count=('is_fake','sum'), total_review_count=('review_id','count')).reset_index()
    grouped_labeled_reviews['avg_stars'] = round(grouped_labeled_reviews['avg_stars'],2)

    # aggregate real reviews
    real_reviews = labeled_reviews[labeled_reviews['is_fake'] == 0]
    grouped_real_reviews = real_reviews.groupby(by='business_id').agg(adj_avg_stars=('stars','mean'), real_review_count=('review_id','count')).reset_index()

    # merge grouped review data
    agg_reviews = grouped_labeled_reviews.merge(grouped_real_reviews, on='business_id')
    agg_reviews['adj_avg_stars'] = round(agg_reviews['adj_avg_stars'],2)
    agg_reviews = agg_reviews[['business_id','total_review_count','fake_review_count','real_review_count','avg_stars','adj_avg_stars']]

    # new fields: fake_review_pct, stars_delta
    agg_reviews['fake_review_pct'] = round(agg_reviews['fake_review_count']/agg_reviews['total_review_count'],2)
    agg_reviews['stars_delta'] = agg_reviews['avg_stars'] - agg_reviews['adj_avg_stars']

    # Add calculated zipcode and metro field
    print('reading metro data...')
    zip_metro = pd.read_csv(metro_file,dtype='str')
    zip_metro = zip_metro[['business_id', 'metro', 'name', 'state', 'zipcode', 'categories']]
    final_df = agg_reviews.merge(zip_metro, on='business_id')

    final_df = final_df[final_df['metro'] in ('Reno', 'Indianapolis')]

    # write to csv - overwrite if exists
    print('exporting to csv...')
    filename = os.path.join('data', 'business_data.csv')
    if os.path.isfile(filename):
        final_df.to_csv(filename, index=False, mode='w')
    else:
        final_df.to_csv(filename, index=False)
    print('done!')


if __name__ == '__main__':
    main()