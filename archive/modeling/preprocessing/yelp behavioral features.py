import pandas as pd
import numpy as np
pd.set_option('mode.chained_assignment', None)
file_review="D:/GT OMSA/DVA/Group Project/Modeling/Scripts/reviewContent.txt"
review=pd.read_csv(file_review,sep="\t",header=None)
review.columns=['user_id', 'prod_id', 'date', 'review']
file_meta="D:/GT OMSA/DVA/Group Project/Modeling/Scripts/metadata.txt"
meta=pd.read_csv(file_meta,sep="\t",header=None)
meta.columns=["user_id","prod_id","rating","label","date"]

join_data=review.merge(meta,on=["user_id","date","prod_id"],how="left")

data=join_data.copy()
data['prev_24'] = np.nan
data['max_24'] = np.nan
length=len(data)

for i in range(length):
    date_i = data['date'][i]
    user_i = data['user_id'][i]
    data.iloc[i, 6] = len(data[(data['date'] == date_i) & (data['user_id'] == user_i)])
    user_data = data[data['user_id'] == user_i].groupby(by='date', axis=0).count()
    data['max_24'][i] = user_data['review'].max()
    
    #review ratios
    user_review_count = len(data[data['user_id'] == user_i])
    user_positive = len(data[(data['user_id'] == user_i) & (data['rating'] >=4)])
    user_negative = len(data[(data['user_id'] == user_i) & (data['rating'] <= 2)])
    
    data['positive_ratio'][i] = user_positive/user_review_count
    data['negative_ratio'][i] = user_negative/user_review_count

from numpy import savetxt
savetxt("reviews_behavioral.txt",join_data,fmt="%s",delimiter="\t",encoding="utf-8")
