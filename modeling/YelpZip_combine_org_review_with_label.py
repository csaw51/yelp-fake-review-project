import csv
import numpy as np
import pandas as pd
file_review="D:/Group Project/YelpZip/reviewContent.txt"
file_meta="D:/Group Project/YelpZip/metadata.txt"


# data loading
review=pd.read_csv(file_review,sep="\t",header=None)
review.columns=["user_id","prod_id","date","review"]
meta=pd.read_csv(file_meta,sep="\t",header=None)
meta.columns=["user_id","prod_id","rating","label","date"]
print("review_Content:")
print(review.head())
print("meta:")
print(meta.head())
print("length of review:",len(review))
print("length of meta:",len(meta))
print("check NA:")
print(review.isnull().values.any())
print(meta.isnull().values.any())
# join_data=review.merge(meta,on=["user_id","date","prod_id"],how="left")
# print(join_data.head())
# print("length of join_data",len(join_data))

# #--------------------checking missed rows start-----------------------
# c=0
# j=0
# for i in range(len(review)):
#     if review.user_id.iloc[i]==meta.user_id.iloc[i]:
#         c+=1
#     else:
#         j+=1
#         if j<20:
#             print("acutal row number:",i+1)
#             print("review.user_id is:",review.user_id.iloc[i])
#             print("review.review content:",review.review.iloc[i])
#             print("meta.user_id is:", meta.user_id.iloc[i])
#             print("the missed meta.label is:", meta.label.iloc[i])
# #-------------------checking missed rows end--------------------------
# print("column names:")
# print(join_data.columns)

# from numpy import savetxt
# savetxt("orig_review_with_labeling.txt",join_data,fmt="%s",delimiter="\t",encoding="utf-8")