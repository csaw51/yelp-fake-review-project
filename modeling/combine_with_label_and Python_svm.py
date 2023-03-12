import csv
import pandas as pd
import numpy as np

file_name="C:/Users/Lu/PycharmProjects/Group_Project/venv/review_features_02.txt"
# data loading
def read_file():
    with open(file_name,encoding="utf-8") as f:
        review=csv.reader(f,delimiter="\t")
        review=pd.DataFrame(review,columns=["userID","list_words","num_words","num_verbs","avg_word_len","emo_ratio",
                                   "num_posi","num_neg","sentiment"])
        #review=review.to_numpy()
    return review
review=read_file()
#print(review.head())

file_label="D:/Group Project/YelpZip/metadata.txt"
with open(file_label,encoding="utf-8") as f:
    label=csv.reader(f,delimiter="\t")
    label=pd.DataFrame(label,columns=["userID","product","rating","labeling","date"])

df1=review[["userID","num_words","num_verbs","avg_word_len","emo_ratio",
                                   "num_posi","num_neg","sentiment"]]
df1=df1.astype({"num_words":"int"})
df1=df1.astype({"num_verbs":"int"})
df1=df1.astype({"avg_word_len":"float"})
df1=df1.astype({"emo_ratio":"float"})
df1=df1.astype({"num_posi":"int"})
df1=df1.astype({"num_neg":"int"})
df1=df1.astype({"sentiment":"float"})

df2=label[["userID","labeling"]]
df2=df2.astype({"labeling":"int"}) # number of fraudulent reviews: 80466


data_join=df1.merge(df2,on="userID",how="left")
data_join=data_join.loc[:,data_join.columns!="userID"]
print(len(data_join))
#data_join["labeling"]=data_join["labeling"].replace(-1,0)
#print(data_join.head())

num_sample=50000
data_join=data_join[0:num_sample] # can only detect 15 fake reviews among 30000 samples (should be )
# #print(data_join.head())


import sklearn
from sklearn.model_selection import train_test_split
from sklearn import svm
from sklearn.metrics import precision_score, accuracy_score,recall_score,f1_score,confusion_matrix

train,test=train_test_split(data_join,test_size=0.3,random_state=1)
X_train=train.loc[:,train.columns!="labeling"]
y_train=train[['labeling']].values.ravel()
X_test=test.loc[:,test.columns!="labeling"]
y_test=test[['labeling']].values.ravel()

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
print("precision score:",precision_score(y_test,y_pred))
print("F1 score:",f1_score(y_test,y_pred))
print("recall score:",recall_score(y_test,y_pred))
print("confusion matrix:")
print(CM)


# fig, ax = plt.subplots(figsize=(7.5, 7.5))
# ax.matshow(CM, cmap=plt.cm.Blues, alpha=0.3)
# for i in range(CM.shape[0]):
#     for j in range(CM.shape[1]):
#         ax.text(x=j, y=i, s=CM[i, j], va='center', ha='center', size='xx-large')
#
# plt.xlabel('Predictions', fontsize=18)
# plt.ylabel('Actuals', fontsize=18)
# plt.title('Confusion Matrix', fontsize=18)
# plt.show()
#
#
#

# from numpy import savetxt
# savetxt("features_with_label02.txt",data_join,fmt="%s",delimiter="\t",encoding="utf-8")