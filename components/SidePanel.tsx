import React, { useState, useEffect } from 'react';
import type { Node, QuizQuestion, Flashcard } from '../types';
import { fetchConceptImage } from '../services/wikipediaService';
import { generateQuizQuestion, generateFlashcard } from '../services/geminiService';

interface SidePanelProps {
  selectedNode: Node | null;
  onClose: () => void;
  onBreakAndStartNewMap: (topic: string) => void;
  setApiError: (message: string | null) => void;
}

const systemColors: { [key: string]: string } = {
  Cardiovascular: 'bg-red-500',
  Nervous: 'bg-blue-500',
  Endocrine: 'bg-purple-500',
  Respiratory: 'bg-sky-500',
  Gastrointestinal: 'bg-orange-500',
  Renal: 'bg-yellow-500',
  Immune: 'bg-green-500',
  Pharmacology: 'bg-indigo-500',
  Metabolic: 'bg-pink-500',
  Diagnostics: 'bg-teal-500',
  Default: 'bg-gray-500',
};

const SidePanel: React.FC<SidePanelProps> = ({ selectedNode, onClose, onBreakAndStartNewMap, setApiError }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isImageLoading, setIsImageLoading] = useState(false);

  // Quiz State
  const [quiz, setQuiz] = useState<QuizQuestion | null>(null);
  const [isQuizLoading, setIsQuizLoading] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswerSubmitted, setIsAnswerSubmitted] = useState(false);

  // Flashcard State
  const [flashcards, setFlashcards] = useState<Flashcard[]>([]);
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [isFlashcardLoading, setIsFlashcardLoading] = useState(false);
  const [isFlashcardFlipped, setIsFlashcardFlipped] = useState(false);

  useEffect(() => {
    if (selectedNode) {
      // Reset states for the new node
      setImageUrl(null);
      setQuiz(null);
      setSelectedAnswer(null);
      setIsAnswerSubmitted(false);
      setFlashcards([]);
      setCurrentFlashcardIndex(0);
      setIsFlashcardFlipped(false);
      setApiError(null); // Clear any existing errors
      
      // Fetch image
      setIsImageLoading(true);
      const getImage = async () => {
        const url = await fetchConceptImage(selectedNode.data.concept);
        setImageUrl(url);
        setIsImageLoading(false);
      };
      getImage();

    }
  }, [selectedNode, setApiError]);
  
  const handleFocusClick = () => {
    if (selectedNode) {
      onBreakAndStartNewMap(selectedNode.data.concept);
      onClose();
    }
  };

  const handleGenerateQuiz = async () => {
    if (!selectedNode) return;

    setIsQuizLoading(true);
    setQuiz(null);
    setSelectedAnswer(null);
    setIsAnswerSubmitted(false);
    setApiError(null);

    try {
      const quizQuestion = await generateQuizQuestion(selectedNode.data);
      setQuiz(quizQuestion);
    } catch (error) {
      setApiError("API Error: Could not generate quiz. You may have exceeded your quota. Please try again later.");
    } finally {
      setIsQuizLoading(false);
    }
  };
  
  const handleGenerateFlashcard = async () => {
    if (!selectedNode) return;

    setIsFlashcardLoading(true);
    setIsFlashcardFlipped(false);
    setApiError(null);
    
    try {
      const card = await generateFlashcard(selectedNode.data, flashcards);
      setFlashcards(prev => [...prev, card]);
      setCurrentFlashcardIndex(flashcards.length);
    } catch (error) {
      setApiError("API Error: Could not generate flashcard. You may have exceeded your quota. Please try again later.");
    } finally {
      setIsFlashcardLoading(false);
    }
  };

  const handleAnswerSelect = (option: string) => {
    if (isAnswerSubmitted) return;
    setSelectedAnswer(option);
  };
  
  const handleSubmitAnswer = () => {
    if(!selectedAnswer) return;
    setIsAnswerSubmitted(true);
  }
  
  const handlePrevFlashcard = () => {
    if (currentFlashcardIndex > 0) {
      setCurrentFlashcardIndex(prev => prev - 1);
      setIsFlashcardFlipped(false);
    }
  };

  const handleNextFlashcard = () => {
    if (currentFlashcardIndex < flashcards.length - 1) {
      setCurrentFlashcardIndex(prev => prev - 1);
      setIsFlashcardFlipped(false);
    }
  };

  const getButtonClass = (option: string) => {
    if (!isAnswerSubmitted) {
      return selectedAnswer === option 
        ? 'bg-cyan-600 border-cyan-400' 
        : 'bg-gray-700 hover:bg-gray-600 border-gray-600';
    }
    // After submission
    if (option === quiz?.correctAnswer) {
      return 'bg-green-500/80 border-green-400';
    }
    if (option === selectedAnswer && option !== quiz?.correctAnswer) {
      return 'bg-red-500/80 border-red-400';
    }
    return 'bg-gray-700/50 border-gray-600 opacity-70';
  };


  if (!selectedNode) return null;

  const { concept, relation, note, difficulty, system } = selectedNode.data;
  const systemColor = system && systemColors[system] ? systemColors[system] : systemColors.Default;
  const currentFlashcard = flashcards[currentFlashcardIndex];
  const isCentralTopic = relation === 'Central Topic';


  return (
    <div className={`fixed top-0 right-0 h-full w-full md:w-1/3 lg:w-1/4 bg-gray-800 bg-opacity-80 backdrop-blur-md text-white shadow-2xl transition-transform transform ${selectedNode ? 'translate-x-0' : 'translate-x-full'} duration-300 ease-in-out z-30`}>
      <div className="p-6 h-full flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-cyan-300">{concept}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar">
           <div className="mb-4">
            {isImageLoading && (
              <div className="w-full h-40 bg-gray-700/50 rounded-md flex justify-center items-center">
                <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
            {imageUrl && !isImageLoading && (
              <img src={imageUrl} alt={concept} className="w-full h-auto max-h-48 object-cover rounded-md mb-4" />
            )}
            {!imageUrl && !isImageLoading && (
              <div className="w-full h-40 bg-gray-700/50 rounded-md flex justify-center items-center text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            )}
          </div>

          <div className="mb-4">
            <span className="text-sm font-semibold text-gray-400 uppercase">Relation to Topic</span>
            <p className="text-lg capitalize">{relation}</p>
          </div>
          
          <div className="mb-4">
            <span className="text-sm font-semibold text-gray-400 uppercase">System</span>
            <div className="flex items-center mt-1">
              <span className={`px-3 py-1 text-sm font-semibold rounded-full text-white ${systemColor}`}>{system || 'General'}</span>
            </div>
          </div>
          
          <div className="mb-4">
            <span className="text-sm font-semibold text-gray-400 uppercase">Note</span>
            <p className="text-lg bg-gray-700/50 p-3 rounded-md">{note}</p>
          </div>
          
          <div className="mb-4">
            <span className="text-sm font-semibold text-gray-400 uppercase">Difficulty</span>
            <div className="flex items-center mt-1">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className={`w-4 h-4 rounded-full mr-1 ${i < difficulty ? 'bg-cyan-400' : 'bg-gray-600'}`}></div>
              ))}
              <span className="ml-2 text-gray-300">({difficulty}/5)</span>
            </div>
          </div>

          {/* Study Mode Section */}
          <div className="mt-6 pt-4 border-t border-gray-600 space-y-4">
            {/* Flashcard Section */}
            {isFlashcardLoading && (
              <div className="flex justify-center items-center p-4">
                  <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                  <p className="ml-3">Generating flashcard...</p>
              </div>
            )}
             {flashcards.length > 0 && !isFlashcardLoading && (
              <div>
                <h3 className="text-lg font-semibold text-cyan-300 mb-2">Flashcard Deck</h3>
                <div className="flashcard-container" onClick={() => setIsFlashcardFlipped(!isFlashcardFlipped)}>
                  <div className={`flashcard-inner ${isFlashcardFlipped ? 'is-flipped' : ''}`}>
                    <div className="flashcard-front">
                      <p className="text-lg">{currentFlashcard.question}</p>
                      <span className="text-xs text-gray-400 absolute bottom-2 right-3">Click to flip</span>
                    </div>
                    <div className="flashcard-back">
                      <p className="text-lg">{currentFlashcard.answer}</p>
                      <span className="text-xs text-gray-400 absolute bottom-2 right-3">Click to flip</span>
                    </div>
                  </div>
                </div>
                {flashcards.length > 1 && (
                  <div className="flex justify-between items-center mt-2">
                    <button onClick={handlePrevFlashcard} disabled={currentFlashcardIndex === 0} className="px-3 py-1 bg-gray-600 rounded disabled:opacity-50">&lt; Prev</button>
                    <span className="text-sm text-gray-400">Card {currentFlashcardIndex + 1} of {flashcards.length}</span>
                    <button onClick={handleNextFlashcard} disabled={currentFlashcardIndex === flashcards.length - 1} className="px-3 py-1 bg-gray-600 rounded disabled:opacity-50">Next &gt;</button>
                  </div>
                )}
              </div>
            )}
            
            {/* Quiz Section */}
            {isQuizLoading && (
              <div className="flex justify-center items-center p-4">
                  <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                  <p className="ml-3">Generating quiz...</p>
              </div>
            )}
            {quiz && !isQuizLoading && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-cyan-300">Test Your Knowledge</h3>
                <p className="text-gray-200">{quiz.question}</p>
                <div className="space-y-2">
                  {quiz.options.map((option, index) => (
                    <button 
                      key={index} 
                      onClick={() => handleAnswerSelect(option)}
                      disabled={isAnswerSubmitted}
                      className={`w-full text-left p-3 rounded-md border transition-all duration-200 ${getButtonClass(option)}`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                {!isAnswerSubmitted ? (
                  <button 
                    onClick={handleSubmitAnswer}
                    disabled={!selectedAnswer}
                    className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
                  >
                    Submit Answer
                  </button>
                ) : (
                  <div className={`p-3 rounded-md text-white ${selectedAnswer === quiz.correctAnswer ? 'bg-green-500/30' : 'bg-red-500/30'}`}>
                    <h4 className="font-bold">{selectedAnswer === quiz.correctAnswer ? 'Correct!' : 'Incorrect.'}</h4>
                    <p className="text-sm mt-1">{quiz.explanation}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="mt-auto pt-4 border-t border-gray-700 grid grid-cols-1 gap-2">
           <button 
            onClick={handleFocusClick}
            disabled={isCentralTopic}
            className="w-full bg-teal-500 hover:bg-teal-600 text-white font-bold py-2 px-4 rounded transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
          >
            Focus on this Topic
          </button>
           <button 
            onClick={handleGenerateFlashcard}
            disabled={isFlashcardLoading}
            className="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
          >
              {flashcards.length > 0 ? 'Generate Another Flashcard' : 'Generate Flashcard'}
          </button>
          <button 
            onClick={handleGenerateQuiz}
            disabled={isQuizLoading}
            className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed"
          >
              {quiz ? 'Generate Another Quiz' : 'Generate Quiz'}
          </button>
        </div>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #2d3748; /* gray-800 */
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #4a5568; /* gray-600 */
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #718096; /* gray-500 */
        }
        .flashcard-container {
            perspective: 1000px;
            cursor: pointer;
            min-height: 150px;
        }
        .flashcard-inner {
            position: relative;
            width: 100%;
            height: 100%;
            transition: transform 0.6s;
            transform-style: preserve-3d;
        }
        .flashcard-container:hover .flashcard-inner {
            /* Optional: slight rotation on hover */
        }
        .is-flipped {
            transform: rotateY(180deg);
        }
        .flashcard-front, .flashcard-back {
            position: absolute;
            width: 100%;
            height: 100%;
            -webkit-backface-visibility: hidden;
            backface-visibility: hidden;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 16px;
            border-radius: 8px;
            background-color: #2d3748; /* gray-800 */
            border: 1px solid #4a5568; /* gray-600 */
            min-height: 150px;
        }
        .flashcard-back {
            transform: rotateY(180deg);
        }
      `}</style>
    </div>
  );
};

export default SidePanel;