
export interface Face {
  age: number;
  bbox: [number, number, number, number];
  det_score: number;
  embedding: number[];
  embedding_norm: number[];
  gender: number;
  image_jpg: string;
  landmark: number[][];
  normed_embedding: number;
}
