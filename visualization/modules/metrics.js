//// Calculate metrics for data stored in array of objects ////
/*businesses_count: count number of businesses per zipcode
review_count: count number of reviews per zipcode
fake_review_count: count number of fake reviews per zipcode
stars_sum: sum all star ratings for each zipcode
real_stars_sum: sum all star ratings for each zipcode of real reviews ONLY
stars_max: maximum star rating for each zipcode
fake_review_pct: percentage of fake reviews for all reviews
stars_mean: mean star rating per zipcode
real stars_mean: mean star rating per zipcode of real reviews ONLY
stars_pct_diff: percent difference between fake review impacted rating (baseline) and rating inclusive of all reviews */
function calculateMetrics(data) {

    // group by zipcode and calculate aggregate metrics (count, sum, max)
    // source: https://stackoverflow.com/questions/29364262/how-to-group-by-and-sum-an-array-of-objects
    var metrics = [];
    data.reduce(function(res, value) {
      if (!res[value.zipcode]) {
        res[value.zipcode] = { zipcode: value.zipcode, businesses_count: 0, review_count: 0, fake_review_count: 0, stars_sum: 0, real_stars_sum: 0, stars_delta: 0};
        metrics.push(res[value.zipcode]);
      }
      res[value.zipcode].businesses_count += 1;
      res[value.zipcode].review_count += value.total_review_count;
      res[value.zipcode].fake_review_count += value.fake_review_count;
      res[value.zipcode].stars_sum += value.avg_stars;
      //if (value.fake_reviews == 0){ res[value.zipcode].real_stars_sum += value.stars }; // TODO: update when we get real data. aggregate this field in preprocessing instead of in here. currently totally inaccurate.
      res[value.zipcode].real_stars_sum += value.adj_avg_stars;
      res[value.zipcode].stars_delta += value.stars_delta;
      //res[value.zipcode].stars_max = Math.max(res[value.zipcode].stars_max, value.stars);
      return res;
    }, {});

    // use aggregated metrics to calculate new ones, like averages and percent change
    metrics.forEach((item) => {
        item.stars_mean = item.stars_sum / item.businesses_count
        item.real_stars_mean = item.real_stars_sum / item.businesses_count
        item.fake_review_pct = item.fake_review_count / item.review_count * 100;
        //item.stars_mean = stars_mean,
        //item.real_stars_mean = real_stars_mean,
        item.stars_pct_diff = Math.abs(item.stars_mean - item.real_stars_mean) / item.real_stars_mean * 100
        item.stars_delta_mean = item.stars_delta / item.businesses_count
    });
    //console.log(metrics)

    return metrics
}

export {calculateMetrics}