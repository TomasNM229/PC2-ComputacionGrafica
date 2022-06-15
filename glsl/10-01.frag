#version 300 es

precision highp float;

in vec3 v_position;
in vec2 v_texcoord;
in vec3 v_normal;

out vec4 color;

uniform sampler2D diffuseMap;

uniform vec3 u_lightColor;
uniform vec3 u_lightPosition;
uniform vec3 u_viewPosition; // camera position

void main() {
	// ambient light
	float ambientStrength = 0.1;
	vec3 ambient = ambientStrength * u_lightColor;

	// diffuse light
	vec3 norm = normalize(v_normal);
	vec3 objectColorDir = normalize(u_lightPosition - v_position);
	float diff = max(dot(norm, objectColorDir), 0.0);
	vec3 diffuse = diff * u_lightColor;

	// specular
	float specularStrength = 0.5;
	vec3 viewDir = normalize(u_viewPosition - v_position);
	vec3 reflectDir = reflect(-objectColorDir, norm);
	float spec = pow(max(dot(viewDir, reflectDir), 0.0), 1024.0);
	vec3 specular = specularStrength * spec * u_lightColor;


	vec4 result = vec4(ambient + diffuse + specular, 1.0);
	color = texture(diffuseMap, v_texcoord) * result;
}
