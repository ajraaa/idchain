const Sidebar = ({ menus, activeMenu, onMenuClick }) => {
  return (
    <aside className="dukcapil-sidebar custom-sidebar">
      <nav className="sidebar-menu">
        {menus.map(menu => (
          <button
            key={menu.key}
            className={`sidebar-menu-item${activeMenu === menu.key ? ' active' : ''}`}
            onClick={() => onMenuClick(menu.key)}
          >
            <span className="sidebar-icon">{menu.icon}</span>
            <span className="sidebar-label">{menu.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar; 