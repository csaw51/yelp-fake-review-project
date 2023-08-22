//// Calculate metrics for data stored in array of objects ////
/*businesses_count: count number of businesses per zipcode
fake_review_pct: percentage of fake reviews for all reviews
stars_delta: change in star rating when excluding on fake reviews
stars_pct_diff: percent difference between fake review impacted rating (baseline) and rating inclusive of all reviews */
function calculateMetrics(data) {

    // group by zipcode and calculate aggregate metrics (count, sum, max)
    // source: https://stackoverflow.com/questions/29364262/how-to-group-by-and-sum-an-array-of-objects
    var metrics = [];
    data.reduce(function(res, value) {
      if (!res[value.zipcode]) {
       res[value.zipcode] = { zipcode: value.zipcode, businesses_count: 0, fake_review_count:0, fake_review_pct_sum:0, stars_delta_sum: 0, stars_pct_diff_sum: 0};
        metrics.push(res[value.zipcode]);
      }
      res[value.zipcode].businesses_count += 1;
      res[value.zipcode].fake_review_count += value.fake_review_count;      
      res[value.zipcode].fake_review_pct_sum += value.fake_review_pct;
      res[value.zipcode].stars_delta_sum += value.stars_delta;
      res[value.zipcode].stars_pct_diff_sum += value.stars_pct_diff;
      return res;
    }, {});

    // use aggregated metrics to calculate new ones, like averages and percent change
    metrics.forEach((item) => {
        item.fake_review_pct = item.fake_review_pct_sum / item.businesses_count
        item.stars_delta = item.stars_delta_sum / item.businesses_count
        item.stars_pct_diff = item.stars_pct_diff_sum / item.businesses_count
    });

    return metrics
}

export {calculateMetrics}