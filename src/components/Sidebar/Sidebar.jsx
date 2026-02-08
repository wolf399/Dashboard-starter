import React from "react";
import "./Sidebar.css";
import logo from "../../imgs/logo.png";
import { SidebarData } from "../../data/Data";


const Sidebar = () => {
    const [selected, setSelected] = React.useState(0);


  return (
    <div className="sidebar">
      <div className="logo">
          <img src={logo} alt="" />
          <span>Sh<span>o</span>ps</span>
      </div>

      {/*Menu*/ }
      <div className="menu">
         {SidebarData.map((item, index) => {
            return (
              <div className={`menuItem ${selected === index ? "active" : ""}`} 
              key={index} 
              onClick={() => setSelected(index)}>
                <item.icon />
                <span>{item.heading}</span>
              </div>
            );
         })}
         
      </div>
    </div>

  );
};

export default Sidebar;