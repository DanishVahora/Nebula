import { Router, Request, Response } from "express";
import { authenticate, requireRole } from "../middleware/auth";
import prisma from "../lib/prisma";

const router = Router();

async function getMembership(classroomId: string, userId: string) {
  return prisma.classroomMember.findUnique({
    where: { classroomId_userId: { classroomId, userId } },
  });
}

router.post(
  "/classrooms/:id/blogs",
  authenticate,
  requireRole("TEACHER"),
  async (req: Request, res: Response) => {
    try {
      const classroomId = req.params.id as string;
      const { title, content } = req.body;

      if (!title || typeof title !== "string" || !title.trim()) {
        res.status(400).json({ error: "Title is required" });
        return;
      }

      if (!content || typeof content !== "string" || !content.trim()) {
        res.status(400).json({ error: "Content is required" });
        return;
      }

      const member = await getMembership(classroomId, req.user!.userId);
      if (!member || member.role !== "TEACHER") {
        res.status(403).json({ error: "Only classroom teachers can create blog posts" });
        return;
      }

      const blog = await prisma.blogPost.create({
        data: {
          classroomId,
          authorId: req.user!.userId,
          title: title.trim(),
          content: content.trim(),
        },
        include: {
          author: { select: { id: true, name: true, avatar: true, email: true } },
        },
      });

      res.status(201).json({ blog });
    } catch (error) {
      console.error("Create classroom blog error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.get(
  "/classrooms/:id/blogs",
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const classroomId = req.params.id as string;
      const member = await getMembership(classroomId, req.user!.userId);

      if (!member) {
        res.status(403).json({ error: "You are not a member of this classroom" });
        return;
      }

      const blogs = await prisma.blogPost.findMany({
        where: { classroomId },
        include: {
          author: { select: { id: true, name: true, avatar: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      });

      res.json({ blogs });
    } catch (error) {
      console.error("Get classroom blogs error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.get("/blogs/:id", authenticate, async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    const blog = await prisma.blogPost.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, name: true, avatar: true, email: true } },
      },
    });

    if (!blog) {
      res.status(404).json({ error: "Blog post not found" });
      return;
    }

    const member = await getMembership(blog.classroomId, req.user!.userId);
    if (!member) {
      res.status(403).json({ error: "You are not a member of this classroom" });
      return;
    }

    res.json({ blog });
  } catch (error) {
    console.error("Get blog error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.put(
  "/blogs/:id",
  authenticate,
  requireRole("TEACHER"),
  async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
      const { title, content } = req.body;

      if (!title || typeof title !== "string" || !title.trim()) {
        res.status(400).json({ error: "Title is required" });
        return;
      }

      if (!content || typeof content !== "string" || !content.trim()) {
        res.status(400).json({ error: "Content is required" });
        return;
      }

      const existing = await prisma.blogPost.findUnique({ where: { id } });
      if (!existing) {
        res.status(404).json({ error: "Blog post not found" });
        return;
      }

      const member = await getMembership(existing.classroomId, req.user!.userId);
      if (!member || member.role !== "TEACHER") {
        res.status(403).json({ error: "Only classroom teachers can edit blog posts" });
        return;
      }

      if (existing.authorId !== req.user!.userId) {
        res.status(403).json({ error: "Only the blog author can edit this post" });
        return;
      }

      const blog = await prisma.blogPost.update({
        where: { id },
        data: {
          title: title.trim(),
          content: content.trim(),
        },
        include: {
          author: { select: { id: true, name: true, avatar: true, email: true } },
        },
      });

      res.json({ blog });
    } catch (error) {
      console.error("Edit blog error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

router.delete(
  "/blogs/:id",
  authenticate,
  requireRole("TEACHER"),
  async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;

      const existing = await prisma.blogPost.findUnique({ where: { id } });
      if (!existing) {
        res.status(404).json({ error: "Blog post not found" });
        return;
      }

      const member = await getMembership(existing.classroomId, req.user!.userId);
      if (!member || member.role !== "TEACHER") {
        res.status(403).json({ error: "Only classroom teachers can delete blog posts" });
        return;
      }

      if (existing.authorId !== req.user!.userId) {
        res.status(403).json({ error: "Only the blog author can delete this post" });
        return;
      }

      await prisma.blogPost.delete({ where: { id } });
      res.json({ message: "Blog post deleted" });
    } catch (error) {
      console.error("Delete blog error:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);

export default router;
