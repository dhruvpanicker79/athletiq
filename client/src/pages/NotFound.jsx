import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="container-x flex flex-col items-center py-32 text-center">
      <p className="score text-8xl text-lime">404</p>
      <h1 className="mt-2 font-display text-3xl font-bold uppercase">Off the pitch</h1>
      <p className="mt-2 text-mute">This page doesn’t exist.</p>
      <Link to="/" className="btn-lime mt-6">Back to home</Link>
    </div>
  );
}
