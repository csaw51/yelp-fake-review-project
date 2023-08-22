import csv
import pandas as pd
import numpy as np

file_review="C:/Users/Lu/PycharmProjects/Group_Project/venv/review_features_02.txt"
# data loading
review=pd.read_csv(file_review,sep="\t",header=None)
review.columns=['user_id', 'prod_id', 'date', 'review', 'rating',
                'label','list_words','lemma','num_of_words','num_of_verb',
                'avg_word_len','emotiveness_ratio','num_positive','num_negative','sentiment']
# review=review[['rating','num_of_words','num_of_verb',
#                 'avg_word_len','emotiveness_ratio','num_positive','num_negative','sentiment','label']]
review=review[['user_id','prod_id','rating','num_of_words','num_of_verb',
                'emotiveness_ratio','num_positive','num_negative','sentiment','label']]

#print(type(review.iloc[0,-1]))
#-------------testing effect of real/fake ratio on model accuracy starts------------------------
# real_reviews=review[review.label==1]
# fake_reviews=review[review.label==-1]
# real=real_reviews.sample(n=80466)
# data=pd.concat([fake_reviews,real])
# num_sample=len(data)
#-------------testing effect of real/fake ratio on model accuracy ends------------------------
# print(len(data))
# print(len(fake_reviews))
num_sample=1000
data=review[0:num_sample]
#print(data_join.head())


import sklearn
from sklearn.model_selection import train_test_split
from sklearn import svm
from sklearn.metrics import precision_score, accuracy_score,recall_score,f1_score,confusion_matrix

# import seaborn as sns
# import matplotlib.pyplot as plt
#
# # plt.figure(figsize=(16, 6))
# # heatmap=sns.heatmap(review.corr(),vmin=-1, vmax=1, annot=True)
# # plt.show()
#
train,test=train_test_split(data,test_size=0.3,random_state=1)
X_train=train.loc[:,train.columns!="label"]
y_train=train[['label']].values.ravel()
X_test=test.loc[:,test.columns!="label"]
y_test=test[['label']].values.ravel()
#
#
#
print("number of fake reviews in testing:",len(test[test['label']==-1]))

clf=svm.SVC(gamma="scale",decision_function_shape="ovo")
clf=svm.SVC()
from sklearn.preprocessing import StandardScaler
scaler=StandardScaler()
X_std_train=scaler.fit(X_train).transform(X_train)
clf.fit(X_std_train,y_train)
X_std_test=scaler.fit(X_test).transform(X_test)
y_pred=clf.predict(X_std_test)

CM=confusion_matrix(y_test,y_pred)
print("number of total samples:",num_sample)
print("number of training samples:",num_sample*0.7)
print("number of testing samples:",num_sample*0.3)
print("accuracy score:",accuracy_score(y_test,y_pred))
# print("precision score:",precision_score(y_test,y_pred))
# print("F1 score:",f1_score(y_test,y_pred))
# print("recall score:",recall_score(y_test,y_pred))
print("confusion matrix:")
print(CM)

