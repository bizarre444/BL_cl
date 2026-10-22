// Star rating: rolling average of guest reviews.

import { clamp } from '../core/rng.js';

export function makeRating() {
  return { reviews: [], stars: 0, totalReviews: 0 };
}

export function addReview(rating, stars) {
  rating.reviews.push(stars);
  if (rating.reviews.length > 40) rating.reviews.shift();
  rating.totalReviews++;
  rating.stars = rating.reviews.reduce((a, b) => a + b, 0) / rating.reviews.length;
}

export function starsFloat(rating) {
  return clamp(rating.stars, 0, 5);
}

export function starsText(rating) {
  const s = Math.round(starsFloat(rating));
  return '★'.repeat(s) + '☆'.repeat(5 - s);
}
