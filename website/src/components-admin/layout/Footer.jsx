// src/c/layout/Footer.jsx
export default function Footer() {
  return (
    <footer className="border-t py-6">
      <div className="container text-center text-sm">
        © {new Date().getFullYear()} SM Int'l — Built with React & Flask
      </div>
    </footer>
  );
}