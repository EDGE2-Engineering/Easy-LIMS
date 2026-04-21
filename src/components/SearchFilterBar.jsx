
import React from 'react';
import { motion } from 'framer-motion';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Rupee from './Rupee';

const SearchFilterBar = ({ filters, onFilterChange }) => {

  const handleReset = () => {
    onFilterChange('reset', null);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white rounded-lg shadow-md p-6 mb-8"
    >
      <div className="flex items-center mb-4">
        <Search className="w-5 h-5 text-primary mr-2" />
        <h3 className="text-lg font-semibold text-gray-900">Search Products</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">Availability</label>
          <Select
            value={filters.status}
            onValueChange={(value) => onFilterChange('status', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Products</SelectItem>
              <SelectItem value="In Stock">In Stock</SelectItem>
              <SelectItem value="Out of Stock">Out of Stock</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">Category</label>
          <Select
            value={filters.category}
            onValueChange={(value) => onFilterChange('category', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="Ghee">Ghee</SelectItem>
              <SelectItem value="Honey">Honey</SelectItem>
              <SelectItem value="Oil">Oil</SelectItem>
              <SelectItem value="Spices">Spices</SelectItem>
              <SelectItem value="Sweeteners">Sweeteners</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">Price Range</label>
          <Select
            value={filters.priceRange}
            onValueChange={(value) => onFilterChange('priceRange', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Price" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Prices</SelectItem>
              <SelectItem value="0-500">Under <Rupee />500</SelectItem>
              <SelectItem value="500-1000"><Rupee />500 - <Rupee />1,000</SelectItem>
              <SelectItem value="1000-2000"><Rupee />1,000 - <Rupee />2,000</SelectItem>
              <SelectItem value="2000-999999">Above <Rupee />2,000</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end">
          <Button
            onClick={handleReset}
            variant="outline"
            className="w-full border-primary text-primary hover:bg-primary hover:text-white"
          >
            Reset Filters
          </Button>
        </div>
      </div>
    </motion.div>
  );
};

export default SearchFilterBar;
