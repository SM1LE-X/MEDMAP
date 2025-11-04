import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import MindMap from './components/MindMap';
import SidePanel from './components/SidePanel';
import Loader from './components/Loader';
import Notification from './components/Notification';
import { generateMedicalMap } from './services/geminiService';
import type { GraphData, MedicalConcept, Node } from './types';

const systemColors: { [key: string]: string } = {
  Cardiovascular: '#ef4444', // red-500
  Nervous: '#3b82f6', // blue-500
  Endocrine: '#8b5cf6', // purple-500
  Respiratory: '#0ea5e9', // sky-500
  Gastrointestinal: '#f97316', // orange-500
  Renal: '#eab308', // yellow-500
  Immune: '#22c55e', // green-500
  Pharmacology: '#6366f1', // indigo-500
  Metabolic: '#ec4899', // pink-500
  Diagnostics: '#14b8a6', // teal-500
  Default: '#6b7280', // gray-500
};

export const App: React.FC = () => {
  const [graphData, setGraphData] = useState<GraphData>({ nodes: [], links: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
const DEFAULT_TOPIC = 'Diabetes Mellitus';
const [topic, setTopic] = useState('');
  const [initialLoad, setInitialLoad] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const historyRef = useRef<HTMLDivElement>(null); // Ref for the entire search/history container
  const searchInputRef = useRef<HTMLInputElement>(null);


  const processConcepts = (concepts: MedicalConcept[], centralTopic: string): GraphData => {
    const centralNode: Node = {
      id: centralTopic,
      color: '#06b6d4', // cyan-500
      data: {
        concept: centralTopic,
        relation: 'Central Topic',
        note: `Central hub for the topic of ${centralTopic}.`,
        difficulty: 0,
        system: 'Core'
      }
    };

    const nodes: Node[] = [centralNode];
    const links = [];

    concepts.forEach(concept => {
      const systemKey = concept.system && systemColors[concept.system] ? concept.system : 'Default';
      nodes.push({
        id: concept.concept,
        color: systemColors[systemKey],
        data: concept
      });
      links.push({
        source: centralTopic,
        target: concept.concept
      });
    });

    return { nodes, links };
  };
  
 const handleGenerateMap = useCallback(async (currentTopic: string, addToHistory: boolean = true) => {
  // Use DEFAULT_TOPIC if the caller passed an empty string or undefined
  const topicToUse = (currentTopic || DEFAULT_TOPIC).trim();
  if (!topicToUse) return;

  setTopic(topicToUse);
  setIsLoading(true);
  setSelectedNode(null);
  setApiError(null);

  try {
    const concepts = await generateMedicalMap(topicToUse);
    const newGraphData = processConcepts(concepts, topicToUse);
    setGraphData(newGraphData);

    if (addToHistory) {
      setSearchHistory(prevHistory => {
        const newHistory = [topicToUse, ...prevHistory.filter(t => t !== topicToUse)];
        return newHistory.slice(0, 10); // keep only recent 10
      });
    }
  } catch (error) {
    console.error("Failed to generate map:", error);
    setApiError("API Error: Could not generate map. You may have exceeded your quota. Please try again later.");
    setGraphData({ nodes: [], links: [] }); // clear graph on error
  } finally {
    setIsLoading(false);
    setInitialLoad(false);
    setShowHistory(false);
  }
}, []);


  // Fix: Renamed to match the prop in SidePanel
  const handleBreakAndStartNewMap = useCallback((newTopic: string) => {
    handleGenerateMap(newTopic);
  }, [handleGenerateMap]);


  const handleNodeClick = useCallback((node: Node) => {
    setSelectedNode(node);
  }, []);

  const handleClosePanel = () => {
    setSelectedNode(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleGenerateMap(topic);
  };

  const handleHistoryClick = useCallback((historyTopic: string) => {
    setTopic(historyTopic);
    handleGenerateMap(historyTopic, false); // Don't add to history again if clicked from history
  }, [handleGenerateMap]);

  // Fix: Correctly check if event target is outside the history/search container
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // event.target is a DOM Element, compatible with Node.contains()
      if (historyRef.current && !historyRef.current.contains(event.target as HTMLElement)) {
        setShowHistory(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);


  const MemoizedMindMap = useMemo(() => <MindMap data={graphData} onNodeClick={handleNodeClick} />, [graphData, handleNodeClick]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-gradient-to-br from-[#0a0f1e] to-[#122a4a] text-white">
      {/* Particle Background */}
      <div id="particle-container" className="absolute inset-0 z-0 opacity-50">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="particle"
            style={{
              '--x': `${Math.random() * 100}%`,
              '--y': `${Math.random() * 100}%`,
              '--d': `${2 + Math.random() * 8}s`,
              '--s': `${1 + Math.random() * 3}px`,
            } as React.CSSProperties}
          ></div>
        ))}
      </div>
      <style>{`
        @keyframes move {
          100% {
            transform: translate3d(calc(var(--x) * 0.5), calc(var(--y) * 0.5), 0);
          }
        }
        .particle {
          position: absolute;
          background: #06b6d4;
          border-radius: 50%;
          width: var(--s);
          height: var(--s);
          left: var(--x);
          top: var(--y);
          animation: move var(--d) linear infinite alternate;
        }
      `}</style>
      
      <Notification message={apiError} onClose={() => setApiError(null)} />

      <header className="absolute top-0 left-0 w-full p-4 z-20 flex justify-center mt-16">
        {/* Fix: historyRef moved to the parent div encompassing search input and history dropdown */}
        <div className="w-full max-w-lg relative" ref={historyRef}>
          <form onSubmit={handleSubmit} className="relative">
            <button
              type="button"
              onClick={() => setShowHistory(prev => !prev)}
              className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-gray-700 hover:bg-gray-600 rounded-full transition-colors z-10"
              aria-label="Search History"
              // Removed ref={historyRef} from button
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-white">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </button>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Enter a medical topic (e.g., Myocardial Infarction)"
              className="w-full pl-12 pr-12 py-3 bg-gray-800/70 border border-gray-600 rounded-full text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-shadow"
              ref={searchInputRef}
            />
            <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-cyan-500 hover:bg-cyan-600 rounded-full transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </form>
          {showHistory && searchHistory.length > 0 && (
            <div className="absolute top-full mt-2 w-full bg-gray-800/90 backdrop-blur-md border border-gray-600 rounded-lg shadow-lg z-30 max-h-60 overflow-y-auto">
              {searchHistory.map((historyTopic, index) => (
                <button
                  key={index}
                  onClick={() => handleHistoryClick(historyTopic)}
                  className="block w-full text-left px-4 py-2 text-white hover:bg-gray-700/70 transition-colors"
                >
                  {historyTopic}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {initialLoad && (
        <div className="absolute inset-0 flex flex-col justify-center items-center z-10 p-4">
          <h1 className="text-5xl font-bold text-center mb-4 bg-clip-text text-transparent bg-gradient-to-r from-cyan-300 to-blue-500 animate-fade-in-1">
            Welcome to MedMap
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl text-center mb-8 animate-fade-in-2">
            Turn complex topic into interactive knowledge galaxies. Start by searching a topic like "Diabetes Mellitus" to see the connections come alive.
          </p>
          <button 
            onClick={() => handleGenerateMap(topic)} 
            className="px-8 py-3 bg-cyan-500 text-white font-bold rounded-full hover:bg-cyan-600 transition-transform transform hover:scale-105 animate-fade-in-3"
          >
            Explore 
          </button>
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(20px); }
              to { opacity: 1; transform: translateY(0); }
            }
            .animate-fade-in-1 { animation: fadeIn 0.8s ease-out forwards; }
            .animate-fade-in-2 { animation: fadeIn 0.8s ease-out forwards 0.2s; }
            .animate-fade-in-3 { animation: fadeIn 0.8s ease-out forwards 0.4s; }
          `}</style>
        </div>
      )}

      {isLoading && <Loader />}
      
      {!initialLoad && MemoizedMindMap}

      <SidePanel 
        selectedNode={selectedNode} 
        onClose={handleClosePanel} 
        onBreakAndStartNewMap={handleBreakAndStartNewMap} // Fix: Changed prop name to match SidePanelProps
        setApiError={setApiError}
      />
    </div>
  );
};