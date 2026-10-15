// Review marker for game content that lives next to its game code (CONTENT_GUIDE 5 and 7: every entry names its basis and
// carries a review status). Item banks in src/content tag each entry; these game files tag the whole file.
import type { ReviewStatus } from './factOrFake/schema';

export interface ContentReview {
  basis: string;
  review_status: ReviewStatus;
}
