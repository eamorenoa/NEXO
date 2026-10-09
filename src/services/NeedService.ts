import { api } from './api';

export const NeedService = {
    list: api.needs,
    create: api.createNeed,
    update: api.updateNeed,
    delete: api.deleteNeed,
};