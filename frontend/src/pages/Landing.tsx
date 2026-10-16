import { Link } from 'react-router-dom';
export default function Landing() {
  return (
    <section className="max-w-2xl py-10">
      <p className="mb-3 text-sm font-medium uppercase tracking-wide text-amber">CSV analytics</p>
      <h1 className="font-serif text-4xl leading-tight sm:text-5xl">Upload a CSV. See what your data actually says.</h1>
      <p className="mt-5 text-lg text-charcoal/80">Every figure is calculated from your own file. No sample data, no guesswork.</p>
      <Link to="/workspace" className="btn mt-8">Open workspace</Link>
    </section>
  );
}
