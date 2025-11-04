import type { SimulationNodeDatum, SimulationLinkDatum } from 'd3';

export interface MedicalConcept {
  concept: string;
  relation: string;
  note: string;
  difficulty: number;
  system?: string;
}

export interface Node extends SimulationNodeDatum {
  id: string;
  width?: number;
  height?: number;
  color: string;
  data: MedicalConcept;
}

export interface Link extends SimulationLinkDatum<Node> {
  source: string | Node;
  target: string | Node;
}

export interface GraphData {
  nodes: Node[];
  links: Link[];
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export interface Flashcard {
  question: string;
  answer: string;
}