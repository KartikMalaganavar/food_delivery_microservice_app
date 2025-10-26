import React, {useEffect, useState} from "react";
import { getMenu } from "../api";
import Menu from "./Menu";

export default function Restaurant({match}) {
  // If using react-router v6, get param differently; using v6: useParams
  const { id } = match.params;
  const [menu, setMenu] = useState([]);
  useEffect(()=> {
    getMenu(id).then(r => setMenu(r.data || r));
  }, [id]);
  return (
    <div className="p-4">
      <h1 className="text-xl">Menu</h1>
      <Menu items={menu} />
    </div>
  );
}
