import Link from "next/link";
import { AudioLines, ArrowUpRight } from "lucide-react";

export function Header() {
  return (
    <header className="site-header">
      <div className="nav-inner">
        <Link className="brand" href="/" aria-label="Practice Interviewer home">
          <span className="brand-mark">
            <AudioLines size={19} aria-hidden="true" />
          </span>{" "}
          practice
          <span style={{ color: "#7968c9", marginLeft: "-7px" }}>.studio</span>
        </Link>
        <nav className="nav-actions" aria-label="Main navigation">
          <Link className="nav-link desktop-link" href="/#how-it-works">
            The approach
          </Link>
          <Link className="nav-link" href="/login">
            Sign in
          </Link>
          <Link className="nav-pill" href="/setup">
            Get started{" "}
            <ArrowUpRight
              size={13}
              style={{ display: "inline", verticalAlign: "middle" }}
              aria-hidden="true"
            />
          </Link>
        </nav>
      </div>
    </header>
  );
}
export function Footer() {
  return (
    <footer className="footer">
      <div className="page-wrap footer-inner">
        <span>© Practice Studio · An internship project</span>
        <span>Built for practice, not hiring decisions.</span>
      </div>
    </footer>
  );
}
