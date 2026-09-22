import React, { useState, useContext } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import './Header.css';
import ThemeToggle from '../../Theme/ThemeToggle';
import { FaBars, FaTimes, FaUserCircle, } from 'react-icons/fa';
import { ThemeContext } from '../../Theme/ThemeContext';
import { AuthContext } from '../Auth/AuthContext';
import Logo from '../../images/Web-logo.png';


const Header = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  // const [showSearch, setShowSearch] = useState(false);  
  // const [searchValue, setSearchValue] = useState(''); 
    const [dropdownOpen, setDropdownOpen] = useState(false);

  const { darkMode } = useContext(ThemeContext);
  const { user, logout: ctxLogout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  // Keep the exact public page so closing an auth screen can return here.
  const loginLinkState = {
    from: `${location.pathname}${location.search}${location.hash}`,
  };

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  // const toggleSearch = () => {
  //   setShowSearch(!showSearch);
  // };

  // const clearSearch = () => {
  //   setSearchValue('');
  // };

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  const handleLogout = () => {
    ctxLogout(); // Clear auth context + localStorage
    setDropdownOpen(false);
    navigate('/login', { replace: true, state: { fromLogout: true } });
  };

  return (
    <header className={`navbar ${darkMode ? 'dark' : 'light'}`}>
      <div className="brand">
        <img className="logo" src={Logo} alt="CuraAid" />
        <div>
          <div className="brand-title">CuraAid</div>
          <div className="brand-sub">Smart Healthcare</div>
        </div>
      </div> 

      <div className="hamburger" onClick={toggleMenu}>
        {menuOpen ? <FaTimes /> : <FaBars />}
      </div>

      <nav className={`nav-links ${menuOpen ? 'open' : ''}`}>
        <NavLink to="/" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>Home</NavLink>
        <NavLink to="/about" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>About Us</NavLink>
        <NavLink to="/pharmacy" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>Pharmacy</NavLink>
        <NavLink to="/ai-health-guide" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>Doctor Finder</NavLink>
        <NavLink to="/feedback" className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>Feedback</NavLink>

        {/* <div className="search-container" onMouseLeave={() => setShowSearch(false)}>
          <div
            className={`search-wrapper ${showSearch ? 'expand' : ''}`}
            onMouseEnter={toggleSearch}
          >
            <span className="search-icon">🔍</span>
            <input
              type="text"
              className="search-input"
              placeholder="Search..."
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
            />
            {searchValue && (
              <span className="clear-icon" onClick={clearSearch}>✖</span>
            )}
          </div>
        </div> */}
      </nav>

      <ThemeToggle />

      <div className="auth-section">
        {user ? (
          <div className="user-profile" onClick={toggleDropdown}>
            {user?.PhotoUrl && !user.PhotoUrl.startsWith('data:image') ? (
              <img
                src={user.PhotoUrl}
                alt="avatar"
                className="avatar-img"
              />
            ) : (
              <FaUserCircle className="avatar-icon" />
            )}
                        {dropdownOpen && (
              <ul className="dropdown-menu">
                <li><NavLink to="/dashboard" onClick={() => setDropdownOpen(false)}>Your Profile</NavLink></li>
                <li onClick={handleLogout}>Logout</li>
              </ul>
            )}
          </div>
        ) : (
          <>
            <NavLink to="/login" state={loginLinkState}>
              <button className="login-btn">Login</button>
            </NavLink>
            <NavLink to="/signup" state={loginLinkState}>
              <button className="login-btn">Signup</button>
            </NavLink>
          </>
        )}
      </div>
    </header>
  );
};

export default Header;
