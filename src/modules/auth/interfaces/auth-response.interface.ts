import { Role } from '../../../common/enums/role.enum';

export interface AuthResponse {
  access_token: string;
  user: {
    user_id: string;
    email: string;
    full_name: string;
    role: Role;
  };
}
