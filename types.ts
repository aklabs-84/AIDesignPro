
export type ElementType = 'text' | 'mask' | 'image';

export interface BoundingBox {
  ymin: number;
  xmin: number;
  ymax: number;
  xmax: number;
}

export interface TextElement {
  id: string;
  type: 'text';
  content: string;
  color: string;
  fontSize: number;
  fontFamily: string;
  textAlign: 'left' | 'center' | 'right';
  x: number; // 0-100%
  y: number; // 0-100%
  width: number; // %
  height: number; // %
  zIndex: number;
  isVisible: boolean;
}

export interface ImageElement {
  id: string;
  type: 'image';
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  isVisible: boolean;
}

export type DesignElement = TextElement | ImageElement;

export interface MaskLayer {
  id: string;
  boundingBox: BoundingBox;
  color: string;
}

export const SUPPORTED_FONTS = [
  { name: '노토 산스 KR', value: "'Noto Sans KR', sans-serif" },
  { name: '나눔 고딕', value: "'Nanum Gothic', sans-serif" },
  { name: '나눔 명조', value: "'Nanum Myeongjo', serif" },
  { name: '블랙한산스', value: "'Black Han Sans', sans-serif" },
  { name: '도현체', value: "'Do Hyeon', sans-serif" },
  { name: '고운 돋움', value: "'Gowun Dodum', sans-serif" }
];
