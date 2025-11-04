export const fetchConceptImage = async (concept: string): Promise<string | null> => {
  const endpoint = `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&pithumbsize=500&titles=${encodeURIComponent(concept)}&origin=*`;

  try {
    const response = await fetch(endpoint);
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const data = await response.json();
    const pages = data.query.pages;
    const pageId = Object.keys(pages)[0];
    
    // Check if the page exists and has a thumbnail
    if (pageId !== "-1" && pages[pageId].thumbnail) {
      return pages[pageId].thumbnail.source;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching image for "${concept}" from Wikipedia:`, error);
    return null;
  }
};
