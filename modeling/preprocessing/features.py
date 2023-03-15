import csv
import pandas as pd
import numpy as np

file_review="C:/Users/Lu/PycharmProjects/Group_Project/venv/orig_review_with_labeling_608598rows_af_lemma.txt"
# data loading
review=pd.read_csv(file_review,sep="\t",header=None)
review.columns=['user_id', 'prod_id', 'date', 'review', 'rating', 'label','list_words','lemma']

import nltk
from nltk import pos_tag
length=len(review)
empty_col=np.empty([length,4])
review=np.append(review,empty_col,1)
for i in range(length):
    if i%100==0:
        print(i)
    text = review[i, 7]
    text=text[1:-1]
    text=text.replace("'","")
    text=text.split(",")
    text=[w.strip() for w in text]

    num_of_words=len(text)
    word_tag = pos_tag(text)
    num_of_verb=0
    num_of_adj=0
    num_of_adv=0
    num_of_noun=0
    sum_len_word=0
    for word, tag in word_tag:
        len_word=len(word)
        sum_len_word += len_word

        tag = tag[0:2].lower()
        if tag=="vb":
            num_of_verb+=1
        elif tag=="jj":
            num_of_adj+=1
        elif tag=="rb":
            num_of_adv+=1
        elif tag=="nn":
            num_of_noun+=1

    avg_word_len=sum_len_word/len(text)
    review[i,8]=num_of_words
    review[i,9]=num_of_verb
    review[i,10]=avg_word_len


    # num_of_clauses=
    # pausality=
    # num_passive_words=
    # num_of_self_group_ref=
    if num_of_noun+num_of_verb!=0:
        emotiveness_ratio=(num_of_adj+num_of_adv)/(num_of_noun+num_of_verb)
    else:
        emotiveness_ratio=0
    review[i,11]=emotiveness_ratio
    #print(num_of_words,num_of_verb,avg_word_len,emotiveness_ratio)

#print(review[0:3,[0,2]])
from numpy import savetxt
savetxt("review_features_01.txt",review,fmt="%s",delimiter="\t",encoding="utf-8")