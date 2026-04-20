import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private baseUrl = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  searchByUsername(username: string) {
    return this.http.get(`${this.baseUrl}/search?username=${encodeURIComponent(username)}`);
  }

  updateProfile(userId: number, data: any) {
    return this.http.put(`${this.baseUrl}/${userId}`, data);
  }
}

