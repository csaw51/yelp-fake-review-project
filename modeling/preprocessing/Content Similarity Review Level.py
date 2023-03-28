# -*- coding: utf-8 -*-
import pandas as pd
pd.set_option('mode.chained_assignment', None)
file_review="E:/DVA/Group Project/Modeling/Scripts/reviewContent2.csv"
review=pd.read_csv(file_review,sep="\t",header=None)
review.columns=['user_id', 'prod_id', 'date', 'review']

print(review.head())
print("number of rows of reviewContent:",len(review))

file_meta="E:/DVA/Group Project/Modeling/Scripts/metadata.txt"
meta=pd.read_csv(file_meta,sep="\t",header=None)
meta.columns=["user_id","prod_id","rating","label","date"]

print(meta.head())
print("number of rows of meta:",len(meta))

join_data=review.merge(meta,on=["user_id","date","prod_id"],how="left")
print(join_data.head())
print("length of join_data:",len(join_data))

from numpy import savetxt
savetxt("orig_review_with_labeling.txt",join_data,fmt="%s",delimiter="\t",encoding="utf-8")

file_review2="E:/DVA/Group Project/Modeling/Scripts/orig_review_with_labeling.txt"
review2=pd.read_csv(file_review2,sep="\t",header=None)
review2.columns=['user_id', 'prod_id', 'date', 'review', 'rating', 'label']
print(review2.head())
print("number of rows of reviewContent:",len(review2))
print("check the null data:",review2.isnull().values.any())

file_meta2="E:/DVA/Group Project/Modeling/Scripts/metadata.txt"
meta2=pd.read_csv(file_meta2,sep="\t",header=None)
meta2.columns=["user_id","prod_id","rating","label","date"]
print(meta2.head())
print("number of rows of meta:",len(meta2))

review2=review2.drop(["label","rating"],axis=1)
join_data2=review2.merge(meta2,on=["user_id","date","prod_id"],how="left")
print(join_data2.head())
print("length of join_data:",len(join_data2))
print("check the null data:",join_data2.isnull().values.any())

savetxt("orig_review_with_labeling_608598rows.txt",join_data2,fmt="%s",delimiter="\t",encoding="utf-8")

file_review3="E:/DVA/Group Project/Modeling/Scripts/orig_review_with_labeling_608598rows.txt"
review3=pd.read_csv(file_review3,sep="\t",header=None)
review3.columns=['user_id', 'prod_id', 'date', 'review', 'rating', 'label']
print(review3.head())
print("length of data:",len(review3))
print("check the null data:",review3.isnull().values.any())

data=review3.copy()
print(len(data.columns))

import string
import numpy as np
import nltk
import re
#nltk.download('punkt')
#nltk.download('stopwords')
#nltk.download('wordnet')
#nltk.download('omw-1.4')

from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from nltk.stem import WordNetLemmatizer
length=len(data)
empty_col=np.empty([length,1])
data=np.append(data,empty_col,1)
print(data.shape)
for i in range(length):
    # a.lower the text
    text=data[i,3].lower()
    
    # b.remove white spaces if there's any        No difference after tokenization, so this step can be removed
    # text = text.strip()
    
    # b.contraction words
    text = text.replace("_", " ")
    text = re.sub(br'(\xc2)(.)', b'', text.encode('utf-8')).decode()
    text = text.replace("can't", "can not")
    text = text.replace("won't", "will not")
    text = text.replace("'ve"," have")
    text = text.replace("'d"," had")
    text = text.replace("'m", " am")
    text = text.replace("'ll", " will")
    text = text.replace("'s", " is")
    text = text.replace("n't", " not")
    text = text.replace("'re", " are")
    text = text.replace("st.", "street")
    text = text.replace("bldg.", "building") 
    
    # c.deal with punctuation such as ‘!”#$%&'()*+,-./:;?@[\]^_`{|}~’, and including "...","???"...
    text=re.sub(r"[^\w\s]", " ", text) 

#     # d.remove punctuation marks such as ‘!”#$%&'()*+,-./:;?@[\]^_`{|}~’
#     text = "".join([i for i in text if i not in string.punctuation])

    # d.remove numbers
    text = re.sub(r"\d+", "", text)

    # e.tokenization
    word_tokens = word_tokenize(text)  #this is a list

    # f.remove stopwords
    stop_words = stopwords.words("english")
    text=[w for w in word_tokens if w not in stop_words]

    # g.lemmatization
    text = [WordNetLemmatizer().lemmatize(word,"a") for word in text]
    text = [WordNetLemmatizer().lemmatize(word, "v") for word in text]
    text = [WordNetLemmatizer().lemmatize(word, "n") for word in text]
    text = [WordNetLemmatizer().lemmatize(word, "s") for word in text]
    text = [WordNetLemmatizer().lemmatize(word, "r") for word in text]

    data[i,6]=text
#print(data[0:5])

savetxt("orig_review_with_labeling_608598rows_af_lemma.txt",data,fmt="%s",delimiter="\t",encoding="utf-8")

file_review4="E:/DVA/Group Project/Modeling/Scripts/orig_review_with_labeling_608598rows_af_lemma.txt"
review4=pd.read_csv(file_review4,sep="\t",header=None)
review4.columns=['user_id', 'prod_id', 'date', 'review', 'rating', 'label','lemma']
print(review4.head())
print("length of data:",len(review4))
print("check the null data:",review4.isnull().values.any())

lemma_test=review4[['lemma']]
count=0
for i in range(len(review4)):
    if 'drink' in lemma_test.iloc[i][0]:
        #print("i:",i)
        count+=1
print("count:",count)

lemma_test=review4[['lemma']]
count=0
for i in range(len(review4)):
    if 'xadinterest' in lemma_test.iloc[i][0]:
        print("i:",i)
        count+=1
print("count:",count)

#Cosine similarity at review level
#As long as the df has 'user_id' and 'lemma' columns this should work fine wherever in the pipeline.

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

review4['cos_sim'] = np.nan

length = len(review4)

cos_sim = []

for i in range(length):
    user_i = review4['user_id'][i]
    user_reviews = review4[review4['user_id'] == user_i]
    corpus = user_reviews[user_reviews['lemma'] != '[]']
    if len(corpus) > 0:
        vectorizer = TfidfVectorizer()
        corpus_vec = vectorizer.fit_transform(corpus['lemma'])
        cos_sim = cosine_similarity(corpus_vec, corpus_vec)
        sum_cos = -1
        for p in range(len(user_reviews)):
            sum_cos += cos_sim[0][p]
            review4['cos_sim'][i] = sum_cos/len(user_reviews)
#    for k in range(len(corpus)):
# 
#        revA_sim = []
#        for p in range(len(corpus)):


#    tfidf = TfidfVectorizer().fit_transform(corpus)
#    pairwise_similarity = tfidf * tfidf.T
    
#    arr = pairwise_similarity.toarray()
#    np.fill_diagonal(arr, np.nan)
#    print(arr.mean(axis=0)[0])
    
#    review4.iloc[i, 7] = arr.mean(axis=0)[0]