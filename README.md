# Detection and Visualization of Fradulent Reviews on Yelp

Table of Contents:
1. Introduction
2. Quick-start Instructions
3. Visualization Description
4. End-to-end Instructions
5. Data Sources

-------------------------------------------------------------------------------------------------------------

## 1. Introduction

  This repo is for code and documentation around the Yelp fake review project in GTech's CSE6242 class. For this project we trained 5 classifiers using the YelpZip dataset, a binary classification problem that determined whether a review was real or fake. We compared the results between Support Vector Machine (SVM), Naive Bayes, K-Nearest Neighbor (KNN), Logistic Regression (LR) and Random Forest (RF). The raw dataset was pre-processed using:
  - TF-IDF to extract behavior
  - SMOTE for resampling of the minority class
  - Feature selection to remove high correlation behavior and textual features

-------------------------------------------------------------------------------------------------------------

## 2. Quick-start Instructions

  - Download and unzip the repository.
  - Download zip code [geojson files](https://github.com/OpenDataDE/State-zip-code-GeoJSON) to the root of the data/json folder.
  - Unzip data/data_merged.zip to the root of the data folder.
  - Run python/DataProcessing.py to convert the model output into the visualization input. Start up a localhost server and navigate to the root folder. Open 'main.html'.
  - Start up a localhost server and navigate to the root folder. Open 'main.html'.
  
-------------------------------------------------------------------------------------------------------------

## 3. Visualization Description
 The visualization includes a chloropleth map, bar chart, and three dropdowns for altering the the map and barchart.
 The first dropdown changes the city, the second changes the business sector, and the third changes the metric for coloring the
 chloropleth map and bar chart. The metrics include:
 - Fake Reviews (%): Percentage of fake reviews out of the total number of reviews.
 - Stars Absolute Difference (%): Absolute relative percent difference of star rating with fake reviews and without fake reviews.
 - Stars Change with Fake Reviews: Change in star rating calculated as the rating excluding fake reviews subtracted from the rating including all reviews.

 The chloropleth map is filtered by the city and business sector specified in the dropdowns.  The light grey overlay in the middle of the map shows the boundaries for the chosen city. 
 The map is divided by zipcode and colored by the metric chosen in the dropdown. Hover over the map to show a:
 - Tooltip including the hovered zipcode, number of fake reviews and all three metrics for the hovered zipcode.
 - Bar chart shows the top five businesses with the largest number of fake reviews for the hovered zipcode. Bars are colored by the chosen metric for each business.
 Clicking anywhere on the map locks the bar chart in place and colors the clicked zip code green. Clicking anywhere else on the page afterwards unlocks the chart.

-------------------------------------------------------------------------------------------------------------

## 4. End-to-end Instructions

  1. All required python packages can be installed using the included requirements.txt:
    ```
    python -m pip install -r requirements.txt
    ```

  3. Pre-processing the YelpZip training data:
     - Download the YelpZip dataset (https://drive.google.com/drive/folders/16A3lqy53BdCr-K70NnOgb205SruxIcub) reviewContent and metadata files to the data directory.
     - Run the script python/join_yelp_zip_data.py to create an inner join between the individual yelpzip files.
       Usage: `python join_yelp_zip_data.py`
       There are optional command line parameters that can be utilized as needed if any of the default file paths are modified after download:
         - metadata_path={metadata filepath}: YelpZip metadata containing user data, rating, date, and label
         - review_content_path={reviewContent filepath}: YelpZip review data
         - output_filepath={output tsv filepath}: Output filepath. Default: 'data/yelpzip_joined.tsv'. **The output path MUST end in .tsv in order for the next script to run**

  4. Feature engineering on preprocessed data:
     - Download [Yelp Academic Dataset V4](https://gatech.app.box.com/s/zvinxc5sj3bwmcoybh3cw4fslywz7ewe/folder/203853457121), files yelp_academic_dataset_business.json and yelp_academic_dataset_review.json to the data directory.
     -  Once pre-processing is finished, we can run the full feature engineering to add textual, behavioral, and TF-IDF features with python/preprocessing_pipeline.py
     - By default, this script is intended to run on the academic yelp dataset, and as such you will have to use the --input_path parameter to point it to the correct file, which is the output of the join_yelp_zip_data.py file from above.
       Usage: `python preprocessing_pipeline.py --input_path='../data/yelpzip_joined.tsv'`
       There are optional command line parameters that can be utilized as needed:
       - input_path={input path}: File path for input dataset
       - output_path={output tsv filepath}: File path for output dataset. Default: 'data/yelp_academic_dataset_preprocessed.tsv'.
       - positive_word_path={positive-words path}: Point to the positive opinion lexicon file postitive-words.txt
       - negative_word_path={negative-words path}: Point to the negative optinion lexicon file negative-words.txt
       - n_process={number of cpus}: The number of processes that the script will use while parallelizing the workload **For the YelpZip training data, the default of 4 should be fine, or use 1 if you are worried about CPU usage and the parallelism will be disabled**
     **WARNING**: This is a very large dataset and this script will take a very long time to complete. You should NOT attempt to run this script unless you have atleast 32GB of memory and over 8 hours of time. This preprocessing was done on a Windows 10 computer with 32GBs of memory and an 8-core processor, with total runtime of around 9 hours.

5. Generating Model Predictions

   The trained model can be downloaded from my personal [google drive](https://drive.google.com/drive/folders/1dtbj9AsoQ1mubjxAIrev9Q2kP62EBdGh?usp=sharing). This *must* be downloaded to python directory as it must be located in the same directory as the generate_model_inferences.py script. Once the script is finished running, it will produce a two-column CSV containing the review_id and the predicted review_label to the output file path.

   Once the pickled model is imported, run the script in order to generate a file of inferences:
        `python generate_model_inferences.py`
        There are optional command line parameters that can be utilized as needed:
        - input_path={input path}: Path to the preprocessed feature data from step 3.
        - output_path={output csv filepath}: File path for output dataset. Default: 'data/reviews_with_predicted_label_final_rf.csv'.
        - model_path={model filepath}: Model file path. Must be downloaded from google drive as mentioned above, or can be generated using the [final results notebook](https://github.com/csaw51/yelp-fake-review-project/blob/main/python/notebooks/final_model_results.ipynb).
    **Note**: This script is intended to be run on the preprocessed Yelp Academic dataset, however it will successfully run on the preprocessed YelpZip dataset as well, with a key difference being that the YelpZip output will contain the index column instead of review_id (as the YelpZip data does not contain a review_id). The YelpZip inferences WILL NOT work with the visualization, ONLY the Yelp Academic inferences will run with the visualization.

6. Run the Visualization
   - Download zip code [geojson files](https://github.com/OpenDataDE/State-zip-code-GeoJSON) to the root of the data/json folder.
   - Run python/DataProcessing.py to convert the model output into the visualization input 'data_merged.csv'.
   - Start up a localhost server and navigate to the root folder. Open 'main.html'. Refer to section 3, visualization description, for usage.

 -------------------------------------------------------------------------------------------------------------

## 5. Data Sources
 - Yelp Academic Dataset V4 (https://www.kaggle.com/datasets/yelp-dataset/yelp-dataset): files yelp_academic_dataset_business.json and yelp_academic_dataset_review.json
 - YelpZip (https://drive.google.com/drive/folders/16A3lqy53BdCr-K70NnOgb205SruxIcub): file ReviewContent
 - Zipcode GeoJson files (https://github.com/OpenDataDE/State-zip-code-GeoJSON)
 - Metro Outline GeoJson files generated with Polygon Creation Application (http://polygons.openstreetmap.fr/index.py)
- Opinion lexicon (positive and negative word lists) (https://gist.github.com/mkulakowski2/4289437 and https://gist.github.com/mkulakowski2/4289441)
