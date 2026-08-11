export interface ChangedFile {
  filename: string;
  status: string;
  patch?: string;
}

export interface ReviewComment {
  path: string;
  line: number;
  body: string;
}

export interface ReviewResult {
  summary: string;
  event: "COMMENT" | "REQUEST_CHANGES" | "APPROVE";
  comments: ReviewComment[];
}
