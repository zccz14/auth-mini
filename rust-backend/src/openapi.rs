use std::io;

const OPENAPI_YAML: &str = include_str!("../../openapi.yaml");

pub(crate) fn read_openapi_yaml() -> String {
    OPENAPI_YAML.to_string()
}

pub(crate) fn read_openapi_json() -> io::Result<serde_json::Value> {
    parse_openapi_json(OPENAPI_YAML)
}

fn parse_openapi_json(yaml_text: &str) -> io::Result<serde_json::Value> {
    let document: serde_json::Value = serde_yaml::from_str(yaml_text)
        .map_err(|error| io::Error::new(io::ErrorKind::InvalidData, error))?;
    if !document.is_object() {
        return Err(io::Error::new(
            io::ErrorKind::InvalidData,
            "openapi.yaml must parse to an object document",
        ));
    }

    Ok(document)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_openapi_yaml_to_object_json_document() {
        let document =
            parse_openapi_json("openapi: 3.1.0\npaths: {}\n").expect("openapi yaml parses");

        assert_eq!(document["openapi"], "3.1.0");
        assert!(document["paths"].is_object());
    }

    #[test]
    fn rejects_yaml_that_is_not_an_object_document() {
        let error = parse_openapi_json("true\n").expect_err("scalar yaml is rejected");

        assert_eq!(error.kind(), io::ErrorKind::InvalidData);
    }

    #[test]
    fn embedded_yaml_and_json_use_the_same_document() {
        let yaml = read_openapi_yaml();
        let json = read_openapi_json().expect("embedded openapi yaml parses");

        assert!(yaml.contains("title: auth-mini HTTP API"));
        assert_eq!(json["openapi"], "3.1.0");
    }
}
