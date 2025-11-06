// src/components/restaurant/MenuManagement.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';

const MenuManagement = () => {
  const [menuItems, setMenuItems] = useState([]);
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [categories, setCategories] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    ingredients: [],
    dietary_info: {
      vegetarian: false,
      vegan: false,
      gluten_free: false,
      spicy: false
    },
    calories: '',
    preparation_time: '',
    available: true,
    is_featured: false
  });

  const API_BASE = 'http://localhost:8000/restaurants';

  useEffect(() => {
    fetchRestaurantAndMenu();
  }, []);

  const fetchRestaurantAndMenu = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Get restaurant
      const myRestaurantsResponse = await axios.get(`${API_BASE}/my-restaurants`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (myRestaurantsResponse.data.length > 0) {
        const myRestaurant = myRestaurantsResponse.data[0];
        setRestaurant(myRestaurant);
        
        // Get menu items
        const menuResponse = await axios.get(`${API_BASE}/menu-items/${myRestaurant.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        setMenuItems(menuResponse.data);
        
        // Get categories
        const categoriesResponse = await axios.get(`${API_BASE}/categories/${myRestaurant.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCategories(categoriesResponse.data.categories || []);
      }
    } catch (error) {
      console.error('Error fetching menu:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const payload = {
        ...formData,
        restaurant_id: restaurant.id,
        price: parseFloat(formData.price),
        calories: formData.calories ? parseInt(formData.calories) : null,
        preparation_time: formData.preparation_time ? parseInt(formData.preparation_time) : null,
        ingredients: formData.ingredients
      };

      if (editingItem) {
        // Update existing item
        await axios.put(`${API_BASE}/menu-items/${editingItem.id}`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('Menu item updated successfully!');
      } else {
        // Create new item
        await axios.post(`${API_BASE}/menu-items`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('Menu item added successfully!');
      }

      resetForm();
      fetchRestaurantAndMenu();
    } catch (error) {
      console.error('Error saving menu item:', error);
      alert('Failed to save menu item');
    }
  };

  const deleteMenuItem = async (itemId) => {
    if (!window.confirm('Are you sure you want to delete this menu item?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_BASE}/menu-items/${itemId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert('Menu item deleted successfully!');
      fetchRestaurantAndMenu();
    } catch (error) {
      console.error('Error deleting menu item:', error);
      alert('Failed to delete menu item');
    }
  };

  const editMenuItem = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      price: item.price.toString(),
      category: item.category,
      ingredients: item.ingredients || [],
      dietary_info: item.dietary_info || {
        vegetarian: false,
        vegan: false,
        gluten_free: false,
        spicy: false
      },
      calories: item.calories?.toString() || '',
      preparation_time: item.preparation_time?.toString() || '',
      available: item.available,
      is_featured: item.is_featured || false
    });
    setShowAddForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      category: '',
      ingredients: [],
      dietary_info: {
        vegetarian: false,
        vegan: false,
        gluten_free: false,
        spicy: false
      },
      calories: '',
      preparation_time: '',
      available: true,
      is_featured: false
    });
    setEditingItem(null);
    setShowAddForm(false);
  };

  const addIngredient = () => {
    setFormData({
      ...formData,
      ingredients: [...formData.ingredients, '']
    });
  };

  const updateIngredient = (index, value) => {
    const newIngredients = [...formData.ingredients];
    newIngredients[index] = value;
    setFormData({ ...formData, ingredients: newIngredients });
  };

  const removeIngredient = (index) => {
    const newIngredients = formData.ingredients.filter((_, i) => i !== index);
    setFormData({ ...formData, ingredients: newIngredients });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">🏪</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">No Restaurant Found</h2>
        <p className="text-gray-600">You need to create a restaurant to manage menu items.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Menu Management</h1>
          <p className="text-gray-600">Manage your restaurant's menu items</p>
        </div>
        
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Add Menu Item
        </button>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows="3"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category *
                </label>
                <input
                  type="text"
                  required
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Appetizers, Main Course, Desserts"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Calories
                  </label>
                  <input
                    type="number"
                    value={formData.calories}
                    onChange={(e) => setFormData({...formData, calories: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prep Time (min)
                  </label>
                  <input
                    type="number"
                    value={formData.preparation_time}
                    onChange={(e) => setFormData({...formData, preparation_time: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Ingredients */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ingredients
              </label>
              <div className="space-y-2">
                {formData.ingredients.map((ingredient, index) => (
                  <div key={index} className="flex space-x-2">
                    <input
                      type="text"
                      value={ingredient}
                      onChange={(e) => updateIngredient(index, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ingredient"
                    />
                    <button
                      type="button"
                      onClick={() => removeIngredient(index)}
                      className="px-3 py-2 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addIngredient}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  + Add Ingredient
                </button>
              </div>
            </div>

            {/* Dietary Information */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dietary Information
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.keys(formData.dietary_info).map(key => (
                  <label key={key} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.dietary_info[key]}
                      onChange={(e) => setFormData({
                        ...formData,
                        dietary_info: {...formData.dietary_info, [key]: e.target.checked}
                      })}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 capitalize">{key.replace('_', ' ')}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Toggles */}
            <div className="flex space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.available}
                  onChange={(e) => setFormData({...formData, available: e.target.checked})}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Available</span>
              </label>
              
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.is_featured}
                  onChange={(e) => setFormData({...formData, is_featured: e.target.checked})}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Featured</span>
              </label>
            </div>

            {/* Form Actions */}
            <div className="flex space-x-3 pt-4">
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
              >
                {editingItem ? 'Update Item' : 'Add Item'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Menu Items List */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Menu Items</h2>
        </div>
        
        {menuItems.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-4xl mb-2">🍽️</div>
            <p>No menu items yet. Add your first item to get started!</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {menuItems.map(item => (
              <div key={item.id} className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                      {!item.available && (
                        <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                          Unavailable
                        </span>
                      )}
                      {item.is_featured && (
                        <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                          Featured
                        </span>
                      )}
                    </div>
                    
                    <p className="text-gray-600 mb-2">{item.description}</p>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span className="font-semibold text-green-600">${item.price}</span>
                      <span>{item.category}</span>
                      {item.calories && <span>🔥 {item.calories} cal</span>}
                      {item.preparation_time && <span>⏱️ {item.preparation_time} min</span>}
                    </div>
                    
                    {/* Dietary badges */}
                    {item.dietary_info && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {item.dietary_info.vegetarian && (
                          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">Vegetarian</span>
                        )}
                        {item.dietary_info.vegan && (
                          <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">Vegan</span>
                        )}
                        {item.dietary_info.gluten_free && (
                          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">Gluten Free</span>
                        )}
                        {item.dietary_info.spicy && (
                          <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded">Spicy</span>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => editMenuItem(item)}
                      className="text-blue-600 hover:text-blue-700 px-3 py-1 rounded text-sm font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteMenuItem(item.id)}
                      className="text-red-600 hover:text-red-700 px-3 py-1 rounded text-sm font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MenuManagement;