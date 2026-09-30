import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h1 className="text-xl font-bold text-sf-text">Record not found</h1>
      <p className="mt-2 text-sm text-sf-text-weak">The record you are looking for does not exist in this org.</p>
      <Link href="/" className="mt-4 inline-block font-semibold text-sf-brand hover:underline">Back to Scan Visiting Card</Link>
    </div>
  );
}
