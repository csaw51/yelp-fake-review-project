# Import packages -----------------------------------------------------------------------------------------

import json
import pandas as pd
import os

# Import Data ---------------------------------------------------------------------------------------------

# Yelp Datasets
yelp_files = ['yelp_academic_dataset_business.json',
         'yelp_academic_dataset_review.json']

yelp_dfs = {}
for file in yelp_files:
    name = file.split('.')[0].split("_")[-1]
    data_file = open(file)
    data = []
    for line in data_file:
        data.append(json.loads(line))
    df = pd.DataFrame(data)
    yelp_dfs[name] = df
    data_file.close()

business_df = yelp_dfs['business']
review_df = yelp_dfs['review']

# Model Output (Predictions)
prediction_file = 'reviews_with_predicted_label_baselinesvm.csv'
predictions_df = pd.read_csv(prediction_file)

# Calculated ZipCode and Metro
zip_metro = pd.read_csv('businesses_reviews.csv')


# Transformations -----------------------------------------------------------------------------------------

# Trim cols and merge
zip_metro = zip_metro[['business_id','zipcode','metro']]

labeled_reviews = review_df.merge(predictions_df, on='review_id')
labeled_reviews = labeled_reviews[['review_id','business_id','stars','review_label']]

# rename 'review_label' column and update labels: -1 (fake) -> 1, 1 (real) -> 0
labeled_reviews = labeled_reviews.rename(columns={'review_label':'is_fake'})
labeled_reviews['is_fake'] = labeled_reviews['is_fake'].replace(1,0)
labeled_reviews['is_fake'] = labeled_reviews['is_fake'].replace(-1,1)

# Aggregate at Business level
grouped_labeled_reviews = labeled_reviews.groupby(by='business_id') \
                                         .agg({'stars':'mean',
                                               'is_fake':'sum',
                                               'review_id':'count'}) \
                                         .reset_index()

# rename cols
grouped_labeled_reviews = grouped_labeled_reviews.reset_index() \
                                                 .rename(columns={'stars':'avg_stars',
                                                                  'is_fake':'fake_review_count',
                                                                  'review_id':'total_review_count'})

# round avg_stars: 2 decimals
grouped_labeled_reviews['avg_stars'] = round(grouped_labeled_reviews['avg_stars'],2)

# Filter out fake reviews and perform aggregations, calculations
real_reviews = labeled_reviews[labeled_reviews['is_fake'] == 0]
grouped_real_reviews = real_reviews.groupby(by='business_id').agg({'stars':'mean','review_id':'count'})
grouped_real_reviews = grouped_real_reviews.reset_index().rename(columns={'stars':'adj_avg_stars',
                                                                          'review_id':'real_review_count'})

# Merge grouped review data
agg_reviews = grouped_labeled_reviews.merge(grouped_real_reviews, on='business_id')
agg_reviews['adj_avg_stars'] = round(agg_reviews['adj_avg_stars'],2)
agg_reviews = agg_reviews[['business_id','total_review_count','fake_review_count',
                           'real_review_count','avg_stars','adj_avg_stars']]

# new fields: fake_review_pct, stars_delta
agg_reviews['fake_review_pct'] = round(agg_reviews['fake_review_count']/agg_reviews['total_review_count'],2)
agg_reviews['stars_delta'] = agg_reviews['adj_avg_stars'] - agg_reviews['avg_stars']

# merge to business df
bus_agg_rev = agg_reviews.merge(business_df, on='business_id')
bus_agg_rev = bus_agg_rev[['business_id','name','address','city','state','postal_code','latitude',
                           'longitude','categories','total_review_count','fake_review_count',
                           'real_review_count','avg_stars','adj_avg_stars','fake_review_pct','stars_delta']]

# Merge in calculated zipcode and metro field
final_df = bus_agg_rev.merge(zip_metro, on='business_id').rename(columns={'zipcode':'zipcode_calc'})

# write to csv -----------------------------------------------------------------------------------------------------

filename = 'business_data.csv'

if os.path.isfile(filename):
    # if the file exists, overwrite it
    final_df.to_csv(filename, index=False, mode='w')
else:
    # if the file does not exist, create a new file
    final_df.to_csv(filename, index=False)