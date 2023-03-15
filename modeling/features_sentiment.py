import csv
import pandas as pd
import numpy as np

file_positive="C:/Users/Lu/Desktop/Opinion Lexicon/positive-words.txt"
file_negative="C:/Users/Lu/Desktop/Opinion Lexicon/negative-words.txt"
file_review="C:/Users/Lu/PycharmProjects/Group_Project/venv/review_features_01.txt"
# data loading
review=pd.read_csv(file_review,sep="\t",header=None)
review.columns=['user_id', 'prod_id', 'date', 'review', 'rating',
                'label','list_words','lemma','num_of_words','num_of_verb',
                'avg_word_len','emotiveness_ratio']

# print(review.head())
# print(review.columns)
positive_list=open(file_positive,"r").read().split()
negative_list=open(file_negative,"r").read().split()


length=len(review)
empty_col=np.empty([length,3])
review=np.append(review,empty_col,1)

for i in range(length):
    if i%100==0:
        print(i)

    num_positive=0
    num_negative=0
    text = review[i, 7]
    text=text[1:-1]
    text=text.replace("'","")
    text=text.split(",")
    text=[w.strip() for w in text]
    len_text=len(text)
    #print(text)
    for m in text:
        for n in positive_list:
            if m==n:
                num_positive+=1
        for k in negative_list:
            if m==k:
                num_negative+=1
    sentiment=(num_positive-num_negative)/len_text
    review[i,12]=num_positive
    review[i,13]=num_negative
    review[i,14]=sentiment
#print(review[0])
    #print(num_positive,num_negative,len_text,sentiment)


# save to txt
from numpy import savetxt
savetxt("review_features_02.txt",review,fmt="%s",delimiter="\t",encoding="utf-8")