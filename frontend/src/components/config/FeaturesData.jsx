import {
    VscGitMerge,
    VscServer,
    VscShield,
    VscTerminal,
    VscExtensions,
    VscBell,
} from 'react-icons/vsc';

export const FEATURES = [
    {
        icon: <VscTerminal size={22} />,
        title: "Professional IDE",
        text: "A native, lightweight editor with built-in Git, terminal, and remote workspace support. No config required — open a project and start coding.",
    },
    {
        icon: <VscExtensions size={22} />,
        title: "Talent Marketplace",
        text: "Post a project or offer your skills. TeamHub connects developers, designers, and teams with the right work — like Fiverr, built for technical people.",
    },
    {
        icon: <VscGitMerge size={22} />,
        title: "Project Management",
        text: "Organize work across boards, milestones, and sprints. Keep your codebase, tasks, and timelines in the same place your team already works.",
    },
    {
        icon: <VscServer size={22} />,
        title: "Team Workspaces",
        text: "Create a shared workspace for your team with unified access control, activity feeds, and synced environments across every member's machine.",
    },
    {
        icon: <VscShield size={22} />,
        title: "Access & Permissions",
        text: "Granular roles at the workspace, project, and file level. Control who reads, who writes, and who reviews — nothing more, nothing less.",
    },
    {
        icon: <VscBell size={22} />,
        title: "Developer Profile",
        text: "Your TeamHub profile is your portfolio. Showcase your projects, contributions, marketplace reviews, and stack — all in one public page.",
    },
];