import csv
import pandas as pd
import numpy as np
import nltk
from nltk.stem import WordNetLemmatizer

file_review="C:/Users/Lu/PycharmProjects/Group_Project/orig_review_with_labeling_608598rows_bf_lemma.txt"
# data loading
review=pd.read_csv(file_review,sep="\t",header=None)
review.columns=['user_id', 'prod_id', 'date', 'review', 'rating', 'label','list_words']
print(review.head())

length=len(review)
empty_col=np.empty([length,1])
review=np.append(review,empty_col,1)

for i in range(length):
    if i%100==0:
        print(i)
    text=review[i,6]
    text = text[1:-1]
    text = text.replace("'", "")
    text = text.split(",")
    text = [w.strip() for w in text]
    #print(text)

    # h.lemmatization
    text=[WordNetLemmatizer().lemmatize(word,"a") for word in text]
    text = [WordNetLemmatizer().lemmatize(word, "v") for word in text]
    text = [WordNetLemmatizer().lemmatize(word, "n") for word in text]
    text = [WordNetLemmatizer().lemmatize(word, "s") for word in text]
    text = [WordNetLemmatizer().lemmatize(word, "r") for word in text]
    #print(text)
#
    review[i,7]=text

from numpy import savetxt
savetxt("orig_review_with_labeling_608598rows_af_lemma.txt",review,fmt="%s",delimiter="\t",encoding="utf-8")