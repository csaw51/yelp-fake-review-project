import csv
import numpy as np
import pandas as pd
file_review="C:/Users/Lu/PycharmProjects/Group_Project/orig_review_with_labeling.txt"
file_meta="D:/Group Project/YelpZip/metadata.txt"
# data loading
review=pd.read_csv(file_review,sep="\t",header=None)
review.columns=['user_id', 'prod_id', 'date', 'review', 'rating', 'label']
meta=pd.read_csv(file_meta,sep="\t",header=None)
meta.columns=["user_id","prod_id","rating","label","date"]
#check the header of review
# print("review:")
# print(review.head())
# print("length of review dataset:",len(review))
review=review.drop(["label","rating"],axis=1)
# print(review.head())
#
join_data=review.merge(meta,on=["user_id","date","prod_id"],how="left")
# join_data=join_data.drop(["rating_y"],axis=1)
# join_data=join_data.rename(columns={"rating_x":"rating"})
print(join_data.head())
print("length of join_data:",len(join_data))
#print(join_data.columns)
#review=review.dropna()
#print("length of review dataset after dropping na:",len(review)) #608457
print(join_data.isnull().values.any())

# for i in range(len(review)):
#     if 9562<=i<=9570:
#         print("row_number:",i+1)
#         print("user_id:",join_data.user_id[i])
#         print("review text:",join_data.review[i])
#         print("review label:",join_data.label[i])
#         print("------------------------------")
# print(join_data.columns)
#
# preprocessing: clean the data and remove noise
import string
import nltk
import re
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from nltk.stem import PorterStemmer, WordNetLemmatizer
#nltk.download('punkt')
#nltk.download('stopwords')

# length=len(review)
# empty_col=np.empty([length,1])
# review=np.append(review,empty_col,1)
# for i in range(length):
#     # a.lower the text
#     text=review[i,3].lower()
#
#     # b.remove white spaces if there's any
#     text = text.strip()
#
#     # c.remove punctuation marks such as ‘!”#$%&'()*+,-./:;?@[\]^_`{|}~’
#     text = "".join([i for i in text if i not in string.punctuation])
#
#     # d.remove numbers
#     text = re.sub(r"\d+", "", text)
#
#     # e.tokenization
#     word_tokens = word_tokenize(text)  #this is a list
#
#     # f.remove stopwords
#     stop_words = stopwords.words("english")
#     text=[w for w in word_tokens if w not in stop_words]
#
#     # g.stemming
#     #text=[PorterStemmer().stem(word) for word in text]
#
#     # h.lemmatization
#     #text=[WordNetLemmatizer.lemmatize(word) for word in text]
#
#     review[i,4]=text
# #print(review[:,4])
# print("length of review af:",len(review))
from numpy import savetxt
savetxt("orig_review_with_labeling_608598rows.txt",join_data,fmt="%s",delimiter="\t",encoding="utf-8")