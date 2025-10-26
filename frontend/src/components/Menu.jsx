import React from "react";

export default function Menu({items}) {
  const addToCart = (item) => {
    const cart = JSON.parse(localStorage.getItem("cart") || "[]");
    const existing = cart.find(c => c.id === item.id);
    if(existing) existing.qty += 1; else cart.push({...item, qty:1});
    localStorage.setItem("cart", JSON.stringify(cart));
    alert("Added");
  }
  return (
    <div className="grid grid-cols-2 gap-4">
      {items.map(i => (
        <div key={i.id} className="p-3 border rounded">
          <h3 className="font-semibold">{i.name}</h3>
          <p>{i.description}</p>
          <div className="flex justify-between items-center mt-2">
            <div>₹{i.price}</div>
            <button className="px-2 py-1 bg-blue-600 text-white rounded" onClick={()=>addToCart(i)}>Add</button>
          </div>
        </div>
      ))}
    </div>
  );
}
