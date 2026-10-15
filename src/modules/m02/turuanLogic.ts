// "Turuan si AI" scoring and test helpers (docs/SPEC.md section 4, Module 2). No UI in here, so it is all unit-tested.
import type { TuruanPost } from '../../content/turuan';
import { accuracy, classify, type Example, type Label, type Model, type Prediction } from './naiveBayes';

/** Points for every post the player labels correctly. */
export const LABEL_POINTS = 10;

/** The examples the detector learns from: the posts with the labels the player gave (right or wrong). */
export const playerExamples = (posts: readonly TuruanPost[], labels: readonly Label[]): Example[] =>
  labels.slice(0, posts.length).flatMap((label, i) => ({ text: (posts[i] as TuruanPost).text, label }));

/** How many of the player's labels match the truth. */
export const labelsRight = (posts: readonly TuruanPost[], labels: readonly Label[]): number => labels.filter((label, i) => posts[i]?.label === label).length;

export const labelScore = (posts: readonly TuruanPost[], labels: readonly Label[]): number => labelsRight(posts, labels) * LABEL_POINTS;

/** Stars by final detector accuracy (0 to 1): 3 at 85% or more, 2 at 65% or more, else 1. */
export const starsForAccuracy = (acc: number): 1 | 2 | 3 => (acc >= 0.85 ? 3 : acc >= 0.65 ? 2 : 1);

export interface TestResult {
  post: TuruanPost;
  prediction: Prediction;
  right: boolean;
}

/** The detector's verdict on every test post. */
export const runTest = (model: Model, posts: readonly TuruanPost[]): TestResult[] =>
  posts.map((post) => {
    const prediction = classify(model, post.text);
    return { post, prediction, right: prediction.label === post.label };
  });

/** Detector accuracy on the test posts, 0 to 1. */
export const testAccuracy = (model: Model, posts: readonly TuruanPost[]): number => accuracy(model, posts);

/** Local-language fakes (not English) the detector let through, for the "it missed" message. */
export const missedLocalFakes = (results: readonly TestResult[]): number =>
  results.filter((r) => r.post.lang !== 'en' && r.post.label === 'fake' && !r.right).length;
export const localFakes = (results: readonly TestResult[]): number => results.filter((r) => r.post.lang !== 'en' && r.post.label === 'fake').length;
