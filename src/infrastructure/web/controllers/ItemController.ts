// infrastructure/web/controllers/ItemController.ts
import { Request, Response } from "express";
import CreateItem from "../../../application/item/CreateItem";
import ListItems, {
  ListItemsFilters,
} from "../../../application/item/ListItems";
import UpdateItem from "../../../application/item/UpdateItem";
import DeleteItem from "../../../application/item/DeleteItem";
import GetItemById from "../../../application/item/ListById";

export default {
  async create(req: any, res: Response) {
    try {
      const dto = {
        ...req.body,
        ownerId: (req as any).userId,
      };
      // Imagen opcional: si no viene archivo, se crea el item sin img_item.
      const item = await new CreateItem().execute(dto);
      return res.status(201).json(item);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  },

  async list(req: any, res: Response) {
    const filters: ListItemsFilters = {
      categoryIds: req.body?.categoryIds,
      minCo2: req.body?.minCo2,
      maxCo2: req.body?.maxCo2,
      nameRegex: req.body?.nameRegex,
      ownerId: req.body?.ownerId != null ? Number(req.body.ownerId) : undefined,
    };
    try {
      const items = await new ListItems().execute(filters);
      res.json(items);
    } catch (err: any) {
      res.status(500).json({ message: err.message });
    }
  },

  async getbyId(req: any, res: Response) {
    try {
      const id = parseInt(req.params.id, 10);
      const item = await new GetItemById().execute(id);
      res.json({ item });
    } catch (err: any) {
      res.status(400).json({ message: err.message });
    }
  },

  async update(req: any, res: Response) {
    try {
      const { id } = req.params;
      const dto = { id, ...req.body };
      const updated = await new UpdateItem().execute(dto);
      return res.json(updated);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  },

  async delete(req: any, res: Response) {
    try {
      const { id } = req.params;
      await new DeleteItem().execute(id);
      return res.status(204).send();
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  },
};
