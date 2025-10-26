import React, {useEffect, useState} from "react";
import { listRestaurants } from "../api";
import { Link } from "react-router-dom";

export default function Home() {
  const [restaurants, setRestaurants] = useState([]);
  useEffect(()=> {
    listRestaurants().then(r => setRestaurants(r.data || r));
  },[]);
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Restaurants</h1>
      <div className="grid grid-cols-3 gap-4 mt-4">
        {restaurants.map(r => (
          <div key={r.id} className="p-4 border rounded shadow">
            <h2 className="font-semibold">{r.name}</h2>
            <p>{r.address}</p>
            <Link to={`/restaurant/${r.id}`} className="inline-block mt-2 text-blue-600">View Menu</Link>
          </div>
        ))}
      </div>
    </div>
  );
}
