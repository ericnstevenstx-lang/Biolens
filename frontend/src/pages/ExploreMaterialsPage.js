import React, { useState, useEffect } from 'react';
import { Search, Loader2, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const ExploreMaterialsPage = () => {
  // CRITICAL: Initialize as empty array to prevent .map() crashes
  const [materials, setMaterials] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const categories = ['All', 'Bio-Based', 'Petro-Based', 'Transition'];

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: fetchError } = await supabase
        .from('materials')
        .select(`
          id,
          material_name,
          material_family,
          petroload_score,
          description,
          consumer_facing_summary,
          transition_flag,
          petro_based_flag,
          plant_based_flag,
          bio_based_flag
        `)
        .eq('review_status', 'published')
        .order('material_name');

      if (fetchError) throw fetchError;
      
      // CRITICAL SAFETY: Ensure materials is always an array
      setMaterials(Array.isArray(data) ? data : []);
      
    } catch (err) {
      console.error('Error fetching materials:', err);
      setError('Failed to load materials. Please try again.');
      setMaterials([]); // Keep as empty array to prevent crashes
    } finally {
      setLoading(false);
    }
  };

  // Safe filtering with null checks
  const filteredMaterials = React.useMemo(() => {
    if (!Array.isArray(materials)) return [];
    
    return materials.filter(material => {
      if (!material) return false;
      
      const matchesSearch = 
        !searchQuery || 
        material.material_name?.toLowerCase().includes(searchQuery.toLowerCase());
      
      let matchesCategory = true;
      if (selectedCategory !== 'All') {
        switch (selectedCategory) {
          case 'Bio-Based':
            matchesCategory = material.bio_based_flag || material.plant_based_flag;
            break;
          case 'Petro-Based':
            matchesCategory = material.petro_based_flag;
            break;
          case 'Transition':
            matchesCategory = material.transition_flag;
            break;
          default:
            matchesCategory = true;
        }
      }
      
      return matchesSearch && matchesCategory;
    });
  }, [materials, searchQuery, selectedCategory]);

  const getPetroloadPercent = (score) => {
    if (typeof score === 'number') {
      return score <= 1 ? Math.round(score * 100) : Math.round(score);
    }
    return 0;
  };

  const getMaterialCategory = (material) => {
    if (material.bio_based_flag || material.plant_based_flag) return 'Bio-Based';
    if (material.petro_based_flag) return 'Petro-Based';
    if (material.transition_flag) return 'Transition';
    return 'Other';
  };

  return (
    <div className="min-h-screen pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Explore Materials
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl">
          Browse our comprehensive database of textile materials and their environmental impacts.
        </p>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search materials..."
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === category
                  ? 'bg-gray-900 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Content States */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          <span className="ml-3 text-gray-600">Loading materials...</span>
        </div>
      ) : error ? (
        <div className="text-center py-12 bg-red-50 rounded-xl border border-red-100">
          <p className="text-red-600 mb-4">{error}</p>
          <button 
            onClick={fetchMaterials}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : filteredMaterials.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No materials found matching your criteria.</p>
          <button 
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('All');
            }}
            className="text-orange-600 hover:text-orange-700 font-medium"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMaterials.map((material) => (
            <Link 
              key={material.id} 
              to={`/results?q=${encodeURIComponent(material.material_name)}`}
              className="group"
            >
              <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 h-full flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 group-hover:text-orange-600 transition-colors">
                      {material.material_name}
                    </h3>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                      {getMaterialCategory(material)}
                    </span>
                  </div>
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
                    getPetroloadPercent(material.petroload_score) >= 80 ? 'bg-red-50 text-red-600' :
                    getPetroloadPercent(material.petroload_score) >= 40 ? 'bg-yellow-50 text-yellow-600' :
                    'bg-green-50 text-green-600'
                  }`}>
                    <span className="text-sm font-bold">
                      {getPetroloadPercent(material.petroload_score)}
                    </span>
                  </div>
                </div>
                
                <p className="text-gray-500 text-sm mb-6 flex-grow">
                  {material.description || material.consumer_facing_summary || "Explore this material's environmental impact profile."}
                </p>
                
                <div className="flex items-center text-orange-600 text-sm font-medium group-hover:translate-x-1 transition-transform">
                  View Analysis <ArrowRight className="ml-1 h-4 w-4" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExploreMaterialsPage;
