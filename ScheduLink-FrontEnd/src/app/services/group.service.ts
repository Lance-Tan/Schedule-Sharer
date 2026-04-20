import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../environments/environment';

export interface GroupMemberDto {
  id: number;
  username: string;
  name: string;
}

export interface ScheduleGroupDto {
  groupId: number;
  name: string;
  members: GroupMemberDto[];
}

@Injectable({
  providedIn: 'root'
})
export class GroupService {
  private baseUrl = `${environment.apiUrl}/groups`;

  constructor(private http: HttpClient) {}

  list(userId: number) {
    return this.http.get<ScheduleGroupDto[]>(this.baseUrl, {
      params: new HttpParams().set('userId', String(userId))
    });
  }

  create(userId: number, name: string) {
    return this.http.post<{ groupId: number; name: string; message: string }>(this.baseUrl, { userId, name });
  }

  rename(groupId: number, userId: number, name: string) {
    return this.http.patch<{ message: string; name: string }>(`${this.baseUrl}/${groupId}`, { userId, name });
  }

  delete(groupId: number, userId: number) {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/${groupId}`, {
      params: new HttpParams().set('userId', String(userId))
    });
  }

  addMember(groupId: number, ownerUserId: number, memberUserId: number) {
    return this.http.post<{ message: string }>(`${this.baseUrl}/${groupId}/members`, {
      ownerUserId,
      memberUserId
    });
  }

  removeMember(groupId: number, ownerUserId: number, memberUserId: number) {
    return this.http.delete<{ message: string }>(`${this.baseUrl}/${groupId}/members/${memberUserId}`, {
      params: new HttpParams().set('ownerUserId', String(ownerUserId))
    });
  }
}
