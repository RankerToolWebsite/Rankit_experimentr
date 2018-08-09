import numpy as np
import pandas as pd
import json
import sys
from sklearn.linear_model import SGDClassifier
from math import log10, floor


def normalize(df):
    return(df - df.mean()) / df.std()


def scale(df):
    return(df - df.min()) / (df.max() - df.min())


def clean_dataset(dataset, primary_key):
    #   temp make primary key index so it doesn't get converted
    dataset.set_index(primary_key, inplace=True)
    #convert categorical variables
    cleaned_dataset = pd.get_dummies(dataset)
    # normalize the data
    cleaned_dataset = normalize(cleaned_dataset)
    cleaned_dataset.reset_index(inplace=True)
    return cleaned_dataset


def get_training(dataset,pairs):
    X = []
    y = []
    for i in range(len(pairs["high"])):

        X.append(np.array(dataset.iloc[pairs["high"][i]]-dataset.iloc[pairs["low"][i]]))
        y.append(1)
        X.append(np.array(dataset.iloc[pairs["low"][i]]-dataset.iloc[pairs["high"][i]]))
        y.append(-1)
    return X,y


def build(dataset, pairs) :
#     make normalized copy of dataset
    dataset_copy = dataset.copy(deep = True)
    dataset_copy = clean_dataset(dataset_copy, 'Title')
    dataset_copy.drop('Title', axis=1, inplace=True)

#     get training pairs
    X,y = get_training(dataset_copy,pairs)
    data = np.array(dataset_copy)

#     train linear SVM classifier
    clf = SGDClassifier(penalty='L2',loss='hinge',fit_intercept=True,
                        max_iter=5000,random_state=9)
    clf.fit(X,y)

    weights = clf.coef_[0]
    y_pred=[]
    y_pred=np.dot(weights,data.T)

#     scale outputs for display
    y_pred=scale(y_pred)

#     predicted score for each item
    dataset['Score'] = y_pred
#     ordinal ranking for each item
    dataset['Rank'] = dataset['Score'].rank(ascending=False)

    return dataset



#/****************************************************/
#read dataset from json
with open('public/data/colleges.json', 'r') as data_file:
    dataset_list = json.load(data_file)
#get pairs passed from front end

s = sys.argv[1]

pairs = pd.read_json(s)

dataset = pd.read_json(json.dumps(dataset_list))

rank = build(dataset=dataset, pairs=pairs)

print(rank.to_json(orient='records'))

