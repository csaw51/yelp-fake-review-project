import csv
import numpy as np
import pandas as pd
file_review="C:/Users/Lu/PycharmProjects/Group_Project/orig_review_with_labeling_608598rows.txt"
file_meta="D:/Group Project/YelpZip/metadata.txt"
# data loading
review=pd.read_csv(file_review,sep="\t",header=None)
review.columns=['user_id', 'prod_id', 'date', 'review', 'rating', 'label']
#review=review[['user_id','review', 'label']]

#check the header of review
# print("review:")
# print(review.head())
# print("length of review dataset:",len(review))

#check the NA
#print(review['rating'].isnull().values.any())
#review=review.dropna()
#print("length of review dataset after dropping na:",len(review)) #

#print(review.user_id.iloc[9561])

# for i in range(9561,9570):
#     print("row_number:",i+1)
#     print("user_id:",review.user_id.iloc[i])
#     print("review text:",review.review.iloc[i])
#     print("review label:",review.label.iloc[i])
#     print("------------------------------")
# print(review.columns)
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

length=len(review)
empty_col=np.empty([length,1])
review=np.append(review,empty_col,1)
print("1")
for i in range(length):
    # a.lower the text
    text=review[i,3].lower()

    # b.remove white spaces if there's any
    text = text.strip()

    # c.remove punctuation marks such as ‘!”#$%&'()*+,-./:;?@[\]^_`{|}~’
    text = "".join([i for i in text if i not in string.punctuation])

    # d.remove numbers
    text = re.sub(r"\d+", "", text)

    # e.tokenization
    word_tokens = word_tokenize(text)  #this is a list

    # f.remove stopwords
    stop_words = stopwords.words("english")
    text=[w for w in word_tokens if w not in stop_words]

    # g.stemming
    #text=[PorterStemmer().stem(word) for word in text]

    # h.lemmatization
    #text=[WordNetLemmatizer.lemmatize(word) for word in text]

    review[i,6]=text
#print(review[:,3])
# print("length of review af:",len(review))
from numpy import savetxt
savetxt("orig_review_with_labeling_608598rows_bf_lemma.txt",review,fmt="%s",delimiter="\t",encoding="utf-8")