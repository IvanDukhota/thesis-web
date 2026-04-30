import { useEffect, useState } from "react";
import "./CodeWindow.css";

const CODE_LINES = [
    { indent: 0, text: "import { useTeamHub } from 'teamhub-sdk';", color: "#9ca3af" },
    { indent: 0, text: "", color: "" },
    { indent: 0, text: "const project = await useTeamHub({", color: "#e5e7eb" },
    { indent: 1, text: "workspace: 'frontend-core',", color: "#9ca3af" },
    { indent: 1, text: "sync: true,", color: "#9ca3af" },
    { indent: 1, text: "collab: ['alice', 'bob', 'carol'],", color: "#9ca3af" },
    { indent: 0, text: "});", color: "#e5e7eb" },
    { indent: 0, text: "", color: "" },
    { indent: 0, text: "project.on('push', async (commit) => {", color: "#e5e7eb" },
    { indent: 1, text: "const review = await project.review(commit);", color: "#9ca3af" },
    { indent: 1, text: "if (review.passed) {", color: "#e5e7eb" },
    { indent: 2, text: "await project.merge(commit.branch);", color: "#9ca3af" },
    { indent: 2, text: "project.notify('✓ Merged successfully');", color: "#6b7280" },
    { indent: 1, text: "}", color: "#e5e7eb" },
    { indent: 0, text: "});", color: "#e5e7eb" },
    { indent: 0, text: "", color: "" },
    { indent: 0, text: "// Real-time collaboration active", color: "#4b5563" },
    { indent: 0, text: "project.connect();", color: "#e5e7eb" },
];

const INDENT = "    ";

export default function CodeWindow() {
    const [visibleLines, setVisibleLines] = useState(0);
    const [cursorVisible, setCursorVisible] = useState(true);

    useEffect(() => {
        if (visibleLines < CODE_LINES.length) {
            const t = setTimeout(() => setVisibleLines((v) => v + 1), 90);
            return () => clearTimeout(t);
        }
    }, [visibleLines]);

    // restart loop
    useEffect(() => {
        if (visibleLines === CODE_LINES.length) {
            const t = setTimeout(() => setVisibleLines(0), 3200);
            return () => clearTimeout(t);
        }
    }, [visibleLines]);

    useEffect(() => {
        const t = setInterval(() => setCursorVisible((v) => !v), 530);
        return () => clearInterval(t);
    }, []);

    return (
        <div className="cw-root">
            <div className="cw-titlebar">
                <span className="cw-dot cw-dot--red" />
                <span className="cw-dot cw-dot--yellow" />
                <span className="cw-dot cw-dot--green" />
                <span className="cw-filename">workspace.js</span>
            </div>

            <div className="cw-body">
                <div className="cw-gutter">
                    {CODE_LINES.map((_, i) => (
                        <span key={i} className="cw-lineno">
                            {i + 1}
                        </span>
                    ))}
                </div>
                <div className="cw-code">
                    {CODE_LINES.map((line, i) => (
                        <div
                            key={i}
                            className="cw-line"
                            style={{
                                opacity: i < visibleLines ? 1 : 0,
                                transition: "opacity 0.15s ease",
                            }}
                        >
                            <span style={{ color: line.color }}>
                                {INDENT.repeat(line.indent)}
                                {line.text}
                            </span>
                            {i === visibleLines - 1 && (
                                <span
                                    className="cw-cursor"
                                    style={{ opacity: cursorVisible ? 1 : 0 }}
                                />
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}